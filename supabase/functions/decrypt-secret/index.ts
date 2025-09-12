import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import CryptoJS from 'https://esm.sh/crypto-js@4.1.1';
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("Decrypt function received request.");
    const { encryptedValue, encryptionKey } = await req.json();
    console.log("Received encryptedValue:", encryptedValue);
    console.log("Received encryptionKey (first 5 chars):", encryptionKey ? encryptionKey.substring(0, 5) : "N/A"); // Log partial key for security

    if (!encryptedValue || !encryptionKey) {
      console.error("Missing encryptedValue or encryptionKey.");
      return new Response(JSON.stringify({ error: "Missing encryptedValue or encryptionKey" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    let decryptedValue;
    try {
      decryptedValue = CryptoJS.AES.decrypt(encryptedValue, encryptionKey).toString(CryptoJS.enc.Utf8);
      console.log("Decryption successful.");
    } catch (decryptError) {
      console.error("CryptoJS decryption failed:", decryptError);
      // If decryption fails, it might be due to incorrect key or corrupted data.
      // Return a specific error message to the client.
      return new Response(JSON.stringify({ error: "Failed to decrypt secret. Possible incorrect key or corrupted data." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400, // Bad Request, as the input data might be the issue
      });
    }

    return new Response(JSON.stringify({ decryptedValue: decryptedValue }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in decrypt function (outer catch):", error);
    return new Response(JSON.stringify({ error: `Failed to decrypt: ${error.message}` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});