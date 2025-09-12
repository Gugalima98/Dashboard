import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe?target=deno&deno-std=0.132.0';

// ==================================================
// INTERFACES AND TYPES
// ==================================================

interface NormalizedSale {
  product_id?: string;
  product_name?: string;
  product_price?: number;
  payment_method?: string;
  customer_name?: string;
  customer_email: string;
  amount: number;
  status: 'completed' | 'refunded' | 'pending' | 'declined' | 'chargeback' | 'abandoned' | 'cancelled' | 'overdue';
  source: 'Stripe' | 'Kiwify';
  platform_fee: number;
  external_id: string;
  created_at: string;
}

interface NormalizedSubscription {
  customer_email?: string;
  customer_name?: string;
  product_id?: string;
  external_id: string;
  status: string;
  source: 'Stripe' | 'Kiwify';
}

// The processStripeEvent function will return one of these types
// to tell the main handler what kind of database operation to perform.
type WebhookResult = 
  | { type: 'sale'; data: NormalizedSale }
  | { type: 'none' } // Used when the handler performs its own DB logic
  | null;

const stripe = new Stripe(Deno.env.get('STRIPE_API_KEY') ?? '', {
  // @ts-ignore
  httpClient: Stripe.createFetchHttpClient(),
});

// ==================================================
// HELPER FUNCTIONS
// ==================================================

// Finds a product in our database by its name.
async function getProductIdByName(supabaseClient: SupabaseClient, name: string): Promise<string | null> {
    if (!name) return null;
    const { data, error } = await supabaseClient.from('products').select('id').eq('name', name).single();
    if (error) {
        if (error.code !== 'PGRST116') { // 'PGRST116' means 0 rows found, which is not an error here.
            console.error(`Error fetching product by name ${name}:`, error);
        }
        return null;
    }
    return data.id;
}


// ==================================================
// STRIPE EVENT HANDLERS
// ==================================================

/**
 * Handles subscription creation or updates. It now saves the customer email directly.
 */
async function handleStripeSubscriptionCreatedUpdated(supabaseClient: SupabaseClient, subscription: any): Promise<void> {
  console.log(`Handling Stripe subscription created/updated: ${subscription.id}`);

  const customer = await stripe.customers.retrieve(subscription.customer as string);
  if (customer.deleted) {
      console.error("Customer has been deleted in Stripe.");
      return;
  }

  const lineItem = subscription.items.data[0];
  const product = await stripe.products.retrieve(lineItem.price.product as string);
  const product_id = await getProductIdByName(supabaseClient, product.name);

  const normalizedSubscription: NormalizedSubscription = {
    customer_email: customer.email,
    customer_name: customer.name,
    product_id: product_id || undefined,
    external_id: subscription.id,
    status: subscription.status,
    source: 'Stripe',
  };

  const { error } = await supabaseClient.from('subscriptions').upsert(normalizedSubscription, { onConflict: 'external_id' });
  if (error) {
      console.error('Error upserting subscription:', error);
  }
}

/**
 * Handles subscription cancellations. This function handles its own database logic.
 */
async function handleStripeSubscriptionDeleted(supabaseClient: SupabaseClient, subscription: any): Promise<void> {
  console.log(`Handling Stripe subscription deleted: ${subscription.id}`);
  
  const { error } = await supabaseClient
    .from('subscriptions')
    .update({ status: 'canceled' })
    .eq('external_id', subscription.id);

  if (error) {
    console.error('Error updating subscription to canceled:', error);
  }
}

/**
 * Handles a completed checkout session. It correctly differentiates between a one-time purchase and the start of a new subscription.
 */
async function handleStripeCheckoutCompleted(supabaseClient: SupabaseClient, session: any): Promise<WebhookResult> {
  console.log(`Handling Stripe checkout.session.completed: ${session.id}`);

  if (session.mode === 'subscription') {
    console.log('Checkout session is for a new subscription. Handling subscription record...');
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    await handleStripeSubscriptionCreatedUpdated(supabaseClient, subscription);
  }

  const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
  if (!lineItems || !lineItems.data || lineItems.data.length === 0) return null;

  const product = lineItems.data[0];
  const price = product.price?.unit_amount ? product.price.unit_amount / 100 : 0;

  const sale: NormalizedSale = {
    product_name: product.description,
    product_price: price,
    payment_method: session.payment_method_types?.[0] || 'card',
    customer_name: session.customer_details?.name || '',
    customer_email: session.customer_details?.email || '',
    amount: session.amount_total / 100,
    status: 'completed',
    source: 'Stripe',
    platform_fee: 0,
    external_id: session.id,
    created_at: new Date(session.created * 1000).toISOString(),
  };
  
  return { type: 'sale', data: sale };
}

/**
 * Handles a successful recurring payment for a subscription.
 */
async function handleStripeInvoicePaid(invoice: any): Promise<WebhookResult> {
    console.log(`Handling Stripe invoice.payment_succeeded: ${invoice.id}`);

    if (invoice.billing_reason === 'subscription_create') {
        console.log('Ignoring invoice for new subscription creation, as it is handled by checkout.session.completed.');
        return null;
    }

    if (!invoice.lines || !invoice.lines.data || invoice.lines.data.length === 0) return null;
    const lineItem = invoice.lines.data[0];
    const price = lineItem.price?.unit_amount ? lineItem.price.unit_amount / 100 : 0;

    const sale: NormalizedSale = {
        product_name: lineItem.description,
        product_price: price,
        payment_method: invoice.payment_settings?.payment_method_types?.[0] || 'card',
        customer_name: invoice.customer_name || '',
        customer_email: invoice.customer_email || '',
        amount: invoice.amount_paid / 100,
        status: 'completed',
        source: 'Stripe',
        platform_fee: 0,
        external_id: invoice.id,
        created_at: new Date(invoice.created * 1000).toISOString(),
    };
    return { type: 'sale', data: sale };
}

/**
 * Handles a refund. It now correctly finds the original product ID and name.
 */
async function handleStripeRefundCreated(supabaseClient: SupabaseClient, refund: any): Promise<WebhookResult> {
    console.log(`Handling Stripe refund.created: ${refund.id}`);

    const charge = await stripe.charges.retrieve(refund.charge as string);
    if (!charge) {
        console.error('Could not retrieve charge for refund:', refund.id);
        return null;
    }

    let originalProductName = 'Reembolso';
    let originalProductId: string | undefined = undefined;

    if (charge.checkout_session) {
        const { data: originalSale } = await supabaseClient
            .from('sales')
            .select('product_id, product_name')
            .eq('external_id', charge.checkout_session)
            .single();
        if (originalSale) {
            originalProductName = originalSale.product_name;
            originalProductId = originalSale.product_id;
        }
    } else if (charge.invoice) {
        const invoice = await stripe.invoices.retrieve(charge.invoice as string);
        const productName = invoice.lines.data[0]?.description;
        if (productName) {
            originalProductName = productName;
            const productId = await getProductIdByName(supabaseClient, productName);
            if (productId) {
                originalProductId = productId;
            }
        }
    }

    const sale: NormalizedSale = {
        product_id: originalProductId,
        product_name: originalProductName,
        customer_email: charge.billing_details.email,
        amount: refund.amount / 100,
        status: 'refunded',
        source: 'Stripe',
        platform_fee: 0,
        external_id: refund.id,
        created_at: new Date(refund.created * 1000).toISOString(),
        product_price: 0,
        payment_method: charge.payment_method_details?.type,
        customer_name: charge.billing_details.name,
    };
    return { type: 'sale', data: sale };
}

/**
 * Main router for all incoming Stripe events.
 */
async function processStripeEvent(supabaseClient: SupabaseClient, req: Request): Promise<WebhookResult> {
  const signature = req.headers.get('Stripe-Signature');
  const signingSecret = Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET');
  if (!signature || !signingSecret) return null;

  const body = await req.text();
  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, signingSecret, undefined, Stripe.createSubtleCryptoProvider());
  } catch (err) {
    console.error(`Stripe webhook signature verification failed: ${err.message}`);
    return null;
  }
  
  const { type, data: { object: dataObject } } = event;
  console.log(`Stripe event received: ${type}`);

  switch (type) {
    case 'checkout.session.completed':
      return await handleStripeCheckoutCompleted(supabaseClient, dataObject);
    case 'invoice.payment_succeeded':
        return await handleStripeInvoicePaid(dataObject);
    case 'refund.created':
        return await handleStripeRefundCreated(supabaseClient, dataObject);
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleStripeSubscriptionCreatedUpdated(supabaseClient, dataObject);
      return { type: 'none' };
    case 'customer.subscription.deleted':
      await handleStripeSubscriptionDeleted(supabaseClient, dataObject);
      return { type: 'none' };
    default:
      console.log(`Unhandled Stripe event type: ${type}`);
      return null;
  }
}

// ==================================================
// KIWIFY EVENT HANDLERS
// ==================================================

async function upsertKiwifySubscription(supabaseClient: SupabaseClient, payload: any) {
    console.log(`Upserting Kiwify subscription: ${payload.subscription_id}`);
    const normalizedSubscription: NormalizedSubscription = {
        customer_email: payload.Customer.email,
        customer_name: payload.Customer.full_name,
        product_id: payload.Product.id,
        external_id: payload.subscription_id,
        status: 'active', // Kiwify sends separate events for cancellation
        source: 'Kiwify',
    };

    const { error } = await supabaseClient.from('subscriptions').upsert(normalizedSubscription, { onConflict: 'external_id' });
    if (error) {
        console.error('Error upserting Kiwify subscription:', error);
    }
}

async function handleKiwifySubscriptionStatusUpdate(supabaseClient: SupabaseClient, payload: any): Promise<WebhookResult> {
    const statusMap = {
        subscription_canceled: 'canceled',
        subscription_late: 'overdue',
    };
    const newStatus = statusMap[payload.webhook_event_type];

    if (newStatus) {
        console.log(`Updating Kiwify subscription ${payload.subscription_id} to status ${newStatus}`);
        const { error } = await supabaseClient
            .from('subscriptions')
            .update({ status: newStatus })
            .eq('external_id', payload.subscription_id);

        if (error) {
            console.error('Error updating Kiwify subscription status:', error);
        }
    }
    return { type: 'none' };
}

async function handleKiwifyOrderPaid(supabaseClient: SupabaseClient, payload: any): Promise<WebhookResult> {
    // If the order is for a subscription, ensure the subscription record exists.
    // Kiwify's `order_approved` for a subscription has `recurrence` != 'ÚNICA'
    if (payload.recurrence !== 'ÚNICA' && payload.subscription_id) {
        await upsertKiwifySubscription(supabaseClient, payload);
    }

    // Always record the sale itself.
    const sale: NormalizedSale = {
        product_id: payload.Product.id,
        product_name: payload.Product.name,
        product_price: payload.Commissions.product_base_price / 100,
        payment_method: payload.payment_method,
        customer_name: payload.Customer.full_name,
        customer_email: payload.Customer.email,
        amount: payload.Commissions.charge_amount / 100,
        status: 'completed',
        source: 'Kiwify',
        platform_fee: payload.Commissions.kiwify_fee / 100,
        external_id: payload.order_id,
        created_at: new Date(payload.created_at).toISOString(),
    };
    return { type: 'sale', data: sale };
}

function handleKiwifyRefund(payload: any): WebhookResult {
    const sale: NormalizedSale = {
        product_id: payload.Product.id,
        product_name: payload.Product.name,
        customer_email: payload.Customer.email,
        customer_name: payload.Customer.full_name,
        amount: payload.Commissions.charge_amount / 100, // Kiwify refund payload might have a different amount field
        status: 'refunded',
        source: 'Kiwify',
        platform_fee: 0,
        external_id: payload.order_id + '_refund', // Create a unique ID for the refund transaction
        created_at: new Date().toISOString(),
    };
    return { type: 'sale', data: sale };
}

async function processKiwifyEvent(supabaseClient: SupabaseClient, req: Request): Promise<WebhookResult> {
  const payload = await req.json();
  const eventType = payload.webhook_event_type || payload.order_status;
  console.log(`Kiwify event received: ${eventType}`);

  switch (eventType) {
    case 'order_approved':
    case 'paid':
    case 'subscription_renewed': // A renewal is also a paid order
      return await handleKiwifyOrderPaid(supabaseClient, payload);

    case 'subscription_canceled':
    case 'subscription_late':
      return await handleKiwifySubscriptionStatusUpdate(supabaseClient, payload);

    case 'refunded':
    case 'order_refunded':
      return handleKiwifyRefund(payload);

    // You can add cases for 'billet_created', 'chargeback', etc. as simple sale entries if needed.
    // default: 
    //  const sale = createSaleFromPayload(payload, 'pending');
    //  return { type: 'sale', data: sale };

    default:
      console.log(`Unhandled Kiwify event type: ${eventType}`);
      return null;
  }
}

// ==================================================
// MAIN SERVER
// ==================================================

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const supabaseClient = createClient(
    Deno.env.get('APP_SUPABASE_URL') ?? '',
    Deno.env.get('APP_SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    let result: WebhookResult = null;
    const url = new URL(req.url);

    if (req.headers.get("Stripe-Signature")) {
      result = await processStripeEvent(supabaseClient, req.clone());
    } else if (url.searchParams.get("source") === "kiwify") {
      result = await processKiwifyEvent(supabaseClient, req.clone());
    } else {
      return new Response("Could not identify webhook source", { status: 400 });
    }

    if (!result || result.type === 'none') {
      return new Response("Event processed.", { status: 200 });
    }

    switch (result.type) {
      case 'sale': {
        const saleData = result.data;
        console.log('Processing sale:', saleData.external_id);

        if (!saleData.product_id && saleData.product_name && saleData.status === 'completed') {
            const existingProductId = await getProductIdByName(supabaseClient, saleData.product_name);
            if (existingProductId) {
                saleData.product_id = existingProductId;
            } else {
                const { data: newProduct, error: productInsertError } = await supabaseClient
                    .from('products')
                    .insert({ name: saleData.product_name, price: saleData.product_price || 0, type: 'Unknown' })
                    .select('id')
                    .single();
                if (productInsertError) throw productInsertError;
                saleData.product_id = newProduct.id;
            }
        }

        const { data: existingSale } = await supabaseClient.from('sales').select('id').eq('external_id', saleData.external_id).single();
        if (existingSale) {
          console.log("Sale already processed:", existingSale.id);
          return new Response("Event already processed", { status: 200 });
        }

        const { error } = await supabaseClient.from('sales').insert(saleData);
        if (error) throw error;
        break;
      }

      case 'subscription': {
        const subData = result.data;
        console.log('Processing subscription:', subData.external_id);
        const { error } = await supabaseClient.from('subscriptions').upsert(subData, { onConflict: 'external_id' });
        if (error) throw error;
        break;
      }
    }

    return new Response(JSON.stringify({ success: true, received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    console.error('Webhook Error:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
});
