import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts'; // Import corsHeaders

serve(async (req) => {
  // Handle preflight requests for CORS
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
    const { email } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Generate a password reset link
    const { error } = await supabaseClient.auth.admin.generateLink({
      type: 'password_reset',
      email: email,
      redirectTo: '/update-password',
    });

    if (error) {
      console.error("Error generating password reset link:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ message: "Password reset link generated successfully." }), {
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
