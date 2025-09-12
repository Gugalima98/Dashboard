import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import CryptoJS from 'https://esm.sh/crypto-js@4.1.1';
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { secret, encryptionKey } = await req.json();

    if (!secret || !encryptionKey) {
      return new Response(JSON.stringify({ error: "Missing secret or encryptionKey" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const encryptedValue = CryptoJS.AES.encrypt(secret, encryptionKey).toString();

    return new Response(JSON.stringify({ encryptedValue: encryptedValue }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
