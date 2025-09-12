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
    const { id, email, password, role } = await req.json();

    if (!id) {
      return new Response(JSON.stringify({ error: "User ID is required." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const authUpdateData: { email?: string; password?: string; } = {};
    if (email) authUpdateData.email = email;
    if (password) authUpdateData.password = password;

    // Update auth user if there is data to update
    if (Object.keys(authUpdateData).length > 0) {
        const { error: authError } = await supabaseClient.auth.admin.updateUserById(id, authUpdateData);
        if (authError) {
            console.error("Error updating auth user:", authError);
            return new Response(JSON.stringify({ error: authError.message }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 500,
            });
        }
    }

    // Update role if it was provided
    if (role) {
        const { error: roleError } = await supabaseClient
            .from('user_roles')
            .upsert({ user_id: id, role_name: role }, { onConflict: 'user_id' });

        if (roleError) {
            console.error("Error upserting user role:", roleError);
            return new Response(JSON.stringify({ error: roleError.message }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 500,
            });
        }
    }

    // Fetch the updated user data to return
    const { data: { user }, error: getUserError } = await supabaseClient.auth.admin.getUserById(id);

    if (getUserError) {
        return new Response(JSON.stringify({ message: "Update succeeded, but failed to fetch final user state.", error: getUserError.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
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
