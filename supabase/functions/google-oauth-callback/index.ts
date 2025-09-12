import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.2'
import { corsHeaders } from '../_shared/cors.ts'
// import { GoogleAuth } from 'https://googleapis.deno.dev/v1/auth:v2.ts'; // BROKEN - REMOVED
import { AnalyticsAdmin } from 'https://googleapis.deno.dev/v1/analyticsadmin:v1beta.ts';
import { SearchConsole } from 'https://googleapis.deno.dev/v1/searchconsole:v1.ts';
import CryptoJS from 'https://esm.sh/crypto-js@4.1.1';

const APP_URL = Deno.env.get('APP_URL') || 'http://localhost:5173';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const redirectUrl = new URL(`${APP_URL}/analytics`);

  try {
    const { access_token, refresh_token } = await req.json();

    if (!access_token) {
      throw new Error('Access token not provided.');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated or found.');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    if (refresh_token) {
      const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
      if (!encryptionKey) {
        throw new Error('ENCRYPTION_KEY is not set in Supabase environment variables.');
      }

      const encrypted_token = CryptoJS.AES.encrypt(refresh_token, encryptionKey).toString();

      const { error: upsertError } = await supabaseAdmin.from('segredos').upsert(
        {
          user_id: user.id,
          name: 'GOOGLE_REFRESH_TOKEN',
          value_encrypted: encrypted_token,
          type: 'OAUTH_TOKEN'
        },
        { onConflict: 'user_id,name' }
      );

      if (upsertError) {
        console.error('Error upserting refresh token:', upsertError);
        throw new Error('Failed to save the refresh token in database.');
      }
    }

    // We can do this in the background, no need to make the user wait
    discoverAndSaveSites(user, access_token, supabaseAdmin);

    return Response.redirect(redirectUrl.toString(), 302);

  } catch (error) {
    console.error('Error in Google OAuth Callback:', error);
    redirectUrl.searchParams.set('error', 'Authentication Failed');
    redirectUrl.searchParams.set('error_description', error.message);
    return Response.redirect(redirectUrl.toString(), 302);
  }
});

async function discoverAndSaveSites(user, access_token, supabaseAdmin) {
  try {
    console.log(`Starting site discovery for user ${user.id}...`);
    
    // Use the working auth object pattern instead of the broken GoogleAuth library
    const auth = {
      _cachedAccessToken: access_token,
      async getAccessToken() {
        return { token: this._cachedAccessToken };
      },
    };

    const analyticsAdmin = new AnalyticsAdmin(auth);
    const searchConsole = new SearchConsole(auth);

    const sitesToInsert = [];

    try {
      const gaProperties = await analyticsAdmin.properties.list();
      for (const property of gaProperties.data.properties || []) {
        if (property.propertyType === 'PROPERTY_TYPE_ORDINARY' && property.displayName && property.name) {
          sitesToInsert.push({
            user_id: user.id,
            name: property.displayName,
            url: property.name,
            ga4_property_id: property.name.split('/').pop(),
            gsc_property_url: null,
          });
        }
      }
    } catch (gaError) {
      console.error(`GA4 discovery failed for user ${user.id}:`, gaError.message);
    }

    try {
      const gscSites = await searchConsole.sites.list();
      for (const siteEntry of gscSites.data.siteEntry || []) {
        if (siteEntry.siteUrl) {
          const existingSite = sitesToInsert.find(s => s.url === siteEntry.siteUrl);
          if (existingSite) {
            existingSite.gsc_property_url = siteEntry.siteUrl;
          } else {
            sitesToInsert.push({
              user_id: user.id,
              name: siteEntry.siteUrl,
              url: siteEntry.siteUrl,
              ga4_property_id: null,
              gsc_property_url: siteEntry.siteUrl,
            });
          }
        }
      }
    } catch (gscError) {
      console.error(`GSC discovery failed for user ${user.id}:`, gscError.message);
    }

    if (sitesToInsert.length > 0) {
      const { error: upsertSitesError } = await supabaseAdmin.from('sites').upsert(sitesToInsert, { onConflict: 'user_id,url' });
      if (upsertSitesError) {
        console.error(`Error upserting discovered sites for user ${user.id}:`, upsertSitesError);
      }
    }
    console.log(`Site discovery completed for user ${user.id}. Found ${sitesToInsert.length} total sites.`);
  } catch (e) {
    console.error(`Unhandled error in background site discovery for user ${user.id}:`, e.message);
  }
}


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { access_token, refresh_token } = await req.json();

    if (!access_token) {
      return new Response(JSON.stringify({ error: 'Access token not provided.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Use the ANON_KEY client to get the user from the session
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated or found.')
    }

    console.log('Authenticated user ID:', user.id);

    // Use the SERVICE_ROLE_KEY client for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Encrypt and store refresh token for future use
    if (refresh_token) {
      const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
      if (!encryptionKey) {
        throw new Error('ENCRYPTION_KEY is not set in Supabase environment variables.');
      }

      const encrypted_token = CryptoJS.AES.encrypt(refresh_token, encryptionKey).toString();

      const { error: upsertError } = await supabaseAdmin.from('segredos').upsert(
        {
          user_id: user.id,
          name: 'GOOGLE_REFRESH_TOKEN',
          value_encrypted: encrypted_token, // Correctly use the encrypted value
          type: 'OAUTH_TOKEN' // Add type for clarity
        },
        { onConflict: 'user_id,name' }
      );

      if (upsertError) {
        console.error('Error upserting refresh token:', upsertError);
        throw new Error('Failed to save the refresh token.');
      }
      console.log('Successfully encrypted and stored refresh token.');
    }

    // Discover and save user's GA4 properties and GSC sites
    const auth = new GoogleAuth({
      accessToken: access_token,
    });

    const analyticsAdmin = new AnalyticsAdmin(auth);
    const searchConsole = new SearchConsole(auth);

    const sitesToInsert = [];

    // Fetch GA4 properties
    try {
      const gaProperties = await analyticsAdmin.properties.list();
      for (const property of gaProperties.data.properties || []) {
        if (property.propertyType === 'PROPERTY_TYPE_ORDINARY' && property.displayName && property.name) {
          sitesToInsert.push({
            user_id: user.id,
            name: property.displayName,
            url: property.name, // Use resource name as URL for GA4
            ga4_property_id: property.name.split('/').pop(), // Extract ID from resource name
            gsc_property_url: null, // GSC will be filled separately
          });
        }
      }
      console.log(`Found ${gaProperties.data.properties?.length || 0} GA4 properties.`);
    } catch (gaError) {
      console.error('Error fetching GA4 properties:', gaError.message);
    }

    // Fetch GSC sites
    try {
      const gscSites = await searchConsole.sites.list();
      for (const siteEntry of gscSites.data.siteEntry || []) {
        if (siteEntry.siteUrl) {
          const existingSite = sitesToInsert.find(s => s.url === siteEntry.siteUrl);
          if (existingSite) {
            existingSite.gsc_property_url = siteEntry.siteUrl;
          } else {
            sitesToInsert.push({
              user_id: user.id,
              name: siteEntry.siteUrl, // Use URL as name for GSC
              url: siteEntry.siteUrl,
              ga4_property_id: null,
              gsc_property_url: siteEntry.siteUrl,
            });
          }
        }
      }
      console.log(`Found ${gscSites.data.siteEntry?.length || 0} GSC sites.`);
    } catch (gscError) {
      console.error('Error fetching GSC sites:', gscError.message);
    }

    // Upsert discovered sites into the 'sites' table
    if (sitesToInsert.length > 0) {
      const { error: upsertSitesError } = await supabaseAdmin.from('sites').upsert(sitesToInsert, { onConflict: 'user_id,url' });
      if (upsertSitesError) {
        console.error('Error upserting discovered sites:', upsertSitesError);
      } else {
        console.log(`Successfully upserted ${sitesToInsert.length} sites.`);
      }
    }

    return new Response(JSON.stringify({ message: 'OAuth successful and sites discovered.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
