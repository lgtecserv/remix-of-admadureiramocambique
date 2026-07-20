import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { checkRateLimit } from '../_shared/rate-limit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreatePastorRequest {
  email: string;
  password: string;
  fullName: string;
  congregationId: string;
  isTitular?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const rateLimit = checkRateLimit(req);
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({ error: `Too many requests. Please try again in ${rateLimit.retryAfter} seconds.` }),
      { 
        status: 429, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Retry-After': String(rateLimit.retryAfter)
        } 
      }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the JWT and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.log('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify super_admin OR secretary via user_roles
    const { data: roles, error: rolesErr } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const callerRoles = (roles ?? []).map((r: any) => r.role);
    const allowed = callerRoles.includes('super_admin') || callerRoles.includes('secretary');

    if (rolesErr || !allowed) {
      console.log('Not allowed:', user.id, 'roles=', callerRoles, 'err=', rolesErr);
      return new Response(
        JSON.stringify({ error: 'Forbidden: Only super admin or secretary can create pastors' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { email, password, fullName, congregationId, isTitular }: CreatePastorRequest = await req.json();

    // Validate input
    if (!email || !password || !fullName || !congregationId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields (email, password, fullName, congregationId)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating pastor account for:', email);

    // Create user in auth
    const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User created:', newUser.user.id);

    // Ensure profile exists in profiles table before inserting role to avoid foreign key / replication lag issues
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .upsert({
        id: newUser.user.id,
        full_name: fullName,
        email: email,
      }, { onConflict: 'id' });

    if (profileError) {
      console.error('Error ensuring profile exists:', profileError);
      await supabaseClient.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: `Failed to ensure profile exists: ${profileError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Assign pastor role + vincular à congregação
    const { error: roleError } = await supabaseClient
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: 'pastor',
        congregation_id: congregationId,
      });

    if (roleError) {
      console.error('Error assigning role:', roleError);
      await supabaseClient.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: `Failed to assign pastor role: ${roleError.message || JSON.stringify(roleError)}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar vínculo em congregation_pastors
    const { error: cpError } = await supabaseClient
      .from('congregation_pastors')
      .insert({
        congregation_id: congregationId,
        pastor_id: newUser.user.id,
        is_titular: !!isTitular,
      });

    if (cpError) {
      console.error('Error linking pastor to congregation:', cpError);
    }

    // Se titular, atualizar congregations.pastor_responsavel_id
    if (isTitular) {
      await supabaseClient
        .from('congregations')
        .update({ pastor_responsavel_id: newUser.user.id })
        .eq('id', congregationId);
    }

    console.log('Pastor role assigned successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Pastor created successfully',
        userId: newUser.user.id 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});