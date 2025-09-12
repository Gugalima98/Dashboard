import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import CryptoJS from 'https://esm.sh/crypto-js@4.1.1';
import { corsHeaders } from '../_shared/cors.ts';

// This function is admin-only. It encrypts and saves system-wide secrets.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Create an admin client to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 2. Check if the user is an admin
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userRole, error: roleError } = await supabaseAdmin.from('user_roles').select('role_name').eq('user_id', user.id).single();
    if (roleError || userRole?.role_name !== 'admin') {
      throw new Error('Permission denied: User is not an admin.');
    }

    // 3. Get plaintext secrets from the request
    const { client_id, client_secret } = await req.json();
    if (!client_id || !client_secret) {
      throw new Error('Client ID and Client Secret are required.');
    }

    // 4. Get the master encryption key
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY is not set in environment variables.');
    }

    // 5. Encrypt the secrets
    const encryptedClientId = CryptoJS.AES.encrypt(client_id, encryptionKey).toString();
    const encryptedClientSecret = CryptoJS.AES.encrypt(client_secret, encryptionKey).toString();

    // 6. Prepare the data for upserting
    const secretsToUpsert = [
      {
        name: 'GOOGLE_CLIENT_ID',
        value_encrypted: encryptedClientId,
        type: 'API_KEY',
        category: 'Google Cloud',
        user_id: null // System-wide secret
      },
      {
        name: 'GOOGLE_CLIENT_SECRET',
        value_encrypted: encryptedClientSecret,
        type: 'API_KEY',
        category: 'Google Cloud',
        user_id: null // System-wide secret
      }
    ];

    // 7. Upsert the secrets into the database
    const { error: upsertError } = await supabaseAdmin.from('segredos').upsert(secretsToUpsert, { onConflict: 'name' });
    if (upsertError) {
      // A more specific check in case onConflict is on (name, user_id)
      if (upsertError.message.includes('conflicting key value violates exclusion constraint')) {
         await supabaseAdmin.from('segredos').update({ value_encrypted: encryptedClientId }).eq('name', 'GOOGLE_CLIENT_ID').is('user_id', null);
         await supabaseAdmin.from('segredos').update({ value_encrypted: encryptedClientSecret }).eq('name', 'GOOGLE_CLIENT_SECRET').is('user_id', null);
      } else {
        throw upsertError;
      }
    }

    return new Response(JSON.stringify({ message: 'System secrets saved successfully.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
