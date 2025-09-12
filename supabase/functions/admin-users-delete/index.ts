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
    const { id } = await req.json();

    if (!id) {
      return new Response(JSON.stringify({ error: "User ID is required." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { data, error } = await supabaseClient.auth.admin.deleteUser(id);

    if (error) {
      console.error("Error deleting user:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ message: "User deleted successfully.", data }), {
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
