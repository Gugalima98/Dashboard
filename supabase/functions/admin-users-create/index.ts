import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response("Method Not Allowed", { headers: corsHeaders, status: 405 });
  }

  const supabaseClient = createClient(
    Deno.env.get('APP_SUPABASE_URL') ?? '',
    Deno.env.get('APP_SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { email, password, role } = await req.json();

    if (!email || !password || !role) {
      return new Response(JSON.stringify({ error: "Email, password, and role are required." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Step 1: Create the user in auth.users
    const { data: { user }, error: createUserError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Automatically confirm email
    });

    if (createUserError) {
      console.error("Error creating user:", createUserError);
      return new Response(JSON.stringify({ error: createUserError.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (!user) {
        return new Response(JSON.stringify({ error: "User could not be created." }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }

    // Step 2: Insert the role into the user_roles table
    const { error: insertRoleError } = await supabaseClient
      .from('user_roles')
      .insert({ user_id: user.id, role_name: role });

    if (insertRoleError) {
      console.error("Error inserting user role:", insertRoleError);
      // Try to clean up by deleting the created user
      await supabaseClient.auth.admin.deleteUser(user.id);
      return new Response(JSON.stringify({ error: `User created but failed to set role: ${insertRoleError.message}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ user }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e: any) {
    console.error("Unhandled error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
