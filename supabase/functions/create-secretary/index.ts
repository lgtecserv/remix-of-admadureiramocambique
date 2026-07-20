import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { checkRateLimit } from "../_shared/rate-limit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateSecretaryRequest {
  email: string;
  password: string;
  fullName: string;
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
          "Content-Type": "application/json",
          "Retry-After": String(rateLimit.retryAfter)
        } 
      }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Token inválido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Apenas super_admin ou secretary podem criar secretários
    const { data: roles } = await admin
      .from('user_roles').select('role').eq('user_id', user.id);
    const callerRoles = (roles ?? []).map((r: any) => r.role);
    const allowed = callerRoles.includes('super_admin') || callerRoles.includes('secretary');
    if (!allowed) {
      return new Response(JSON.stringify({ success: false, error: 'Apenas super admin pode criar secretários' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: CreateSecretaryRequest = await req.json().catch(() => ({} as CreateSecretaryRequest));
    const { email, password, fullName } = body;
    if (!email || !password || !fullName) {
      return new Response(JSON.stringify({ success: false, error: 'Campos obrigatórios ausentes' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (password.length < 6 || password.length > 72) {
      return new Response(JSON.stringify({ success: false, error: 'Senha deve ter entre 6 e 72 caracteres' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { full_name: fullName },
    });
    if (createError || !newUser?.user) {
      return new Response(JSON.stringify({ success: false, error: createError?.message || 'Erro ao criar usuário' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ensure profile exists in profiles table before inserting role to avoid foreign key / replication lag issues
    const { error: profileError } = await admin
      .from('profiles')
      .upsert({
        id: newUser.user.id,
        full_name: fullName,
        email: email,
      }, { onConflict: 'id' });

    if (profileError) {
      await admin.auth.admin.deleteUser(newUser.user.id);
      return new Response(JSON.stringify({ success: false, error: 'Falha ao garantir que o perfil existe: ' + profileError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error: roleError } = await admin
      .from('user_roles')
      .insert({ user_id: newUser.user.id, role: 'secretary' });
    if (roleError) {
      await admin.auth.admin.deleteUser(newUser.user.id);
      return new Response(JSON.stringify({ success: false, error: 'Falha ao atribuir papel de secretário: ' + roleError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, userId: newUser.user.id }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro inesperado';
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
