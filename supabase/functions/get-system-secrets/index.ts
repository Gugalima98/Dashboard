import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import CryptoJS from 'https://esm.sh/crypto-js@4.1.1';
import { corsHeaders } from '../_shared/cors.ts';

// This function is admin-only. It decrypts and returns system-wide secrets.
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

    // 3. Get the master encryption key
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY is not set in environment variables.');
    }

    // 4. Fetch the encrypted secrets from the database
    const { data: secrets, error: fetchError } = await supabaseAdmin
      .from('segredos')
      .select('name, value_encrypted')
      .in('name', ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'])
      .is('user_id', null);

    if (fetchError) throw fetchError;

    // 5. Decrypt the secrets
    let clientId = '';
    let clientSecret = '';

    for (const secret of secrets) {
      const decryptedValue = CryptoJS.AES.decrypt(secret.value_encrypted, encryptionKey).toString(CryptoJS.enc.Utf8);
      if (secret.name === 'GOOGLE_CLIENT_ID') {
        clientId = decryptedValue;
      }
      if (secret.name === 'GOOGLE_CLIENT_SECRET') {
        clientSecret = decryptedValue;
      }
    }

    return new Response(JSON.stringify({ client_id: clientId, client_secret: clientSecret }), {
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
