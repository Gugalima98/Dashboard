import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Function to get user from JWT
async function getUser(supabaseClient: SupabaseClient, req: Request) {
    const authHeader = req.headers.get('Authorization')!;
    const { data: { user }, error } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (error) throw error;
    return user;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdminClient = createClient(
      Deno.env.get('APP_SUPABASE_URL') ?? '',
      Deno.env.get('APP_SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the user making the request
    const user = await getUser(supabaseAdminClient, req);
    if (!user) {
        return new Response(JSON.stringify({ isAdmin: false, error: 'User not found' }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 401,
        });
    }

    // Check the user's role from the user_roles table
    const { data: userRoles, error: roleError } = await supabaseAdminClient
      .from('user_roles')
      .select('role_name')
      .eq('user_id', user.id);

    if (roleError) {
        return new Response(JSON.stringify({
            isAdmin: false,
            checkedUserId: user.id,
            foundRole: null,
            dbError: `Database error: ${roleError.message}`
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200, 
        });
    }

    const userRole = userRoles && userRoles.length > 0 ? userRoles[0] : null;
    const isAdmin = userRole?.role_name === 'admin';

    // Return a more detailed debug response
    return new Response(JSON.stringify({
        isAdmin: isAdmin,
        checkedUserId: user.id,
        foundRole: userRole?.role_name || null,
        dbError: null
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
