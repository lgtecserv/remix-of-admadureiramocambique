import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authorization - only pastors and super_admins can create leaders
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado", success: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Token inválido", success: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Check if the caller is a pastor or super_admin
    const { data: isPastor } = await supabase.rpc("has_role", { _user_id: user.id, _role: "pastor" });
    const { data: isSuperAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "super_admin" });

    if (!isPastor && !isSuperAdmin) {
      console.error("Unauthorized: user is not pastor or super_admin:", user.id);
      return new Response(
        JSON.stringify({ error: "Apenas pastores podem cadastrar líderes", success: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    console.log("Authorized user:", user.id, "isPastor:", isPastor, "isSuperAdmin:", isSuperAdmin);

    // Get request body
    const { email, password, fullName, department, congregationId } = await req.json();

    console.log("Creating leader:", { email, fullName, department });

    // Validate inputs
    if (!email || !password || !fullName || !department) {
      throw new Error("Todos os campos são obrigatórios");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 255) {
      throw new Error("Email inválido");
    }

    // Validate name length
    if (fullName.trim().length === 0 || fullName.length > 100) {
      throw new Error("Nome deve ter entre 1 e 100 caracteres");
    }

    // Validate password length
    if (password.length < 6 || password.length > 72) {
      throw new Error("Senha deve ter entre 6 e 72 caracteres");
    }

    // Validate department
    const validDepartments = ["jovens", "irmas", "varoes", "adolescentes", "criancas", "patrimonio", "tesouraria"];
    if (!validDepartments.includes(department)) {
      throw new Error("Departamento inválido");
    }

    // Create user with admin privileges (bypasses RLS and doesn't change current session)
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
      },
    });

    if (userError) {
      console.error("Error creating user:", userError);
      throw userError;
    }

    if (!userData.user) {
      throw new Error("Erro ao criar usuário");
    }

    console.log("User created successfully:", userData.user.id);

    // Ensure profile exists in profiles table before inserting role to avoid foreign key / replication lag issues
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: userData.user.id,
        full_name: fullName,
        email: email,
      }, { onConflict: 'id' });

    if (profileError) {
      console.error("Error ensuring profile exists:", profileError);
      await supabase.auth.admin.deleteUser(userData.user.id);
      throw new Error("Erro ao garantir que o perfil existe: " + profileError.message);
    }

    // Insert role immediately
    const { error: roleError } = await supabase.from("user_roles").insert({
      user_id: userData.user.id,
      role: "leader",
      department: department,
      congregation_id: congregationId || null,
    });

    if (roleError) {
      console.error("Error creating role:", roleError);
      // Try to delete the user if role creation fails
      await supabase.auth.admin.deleteUser(userData.user.id);
      throw new Error("Erro ao atribuir role ao líder: " + roleError.message);
    }

    console.log("Leader role assigned successfully");

    return new Response(
      JSON.stringify({
        success: true,
        userId: userData.user.id,
        message: "Líder cadastrado com sucesso!",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in create-leader function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Erro ao cadastrar líder",
        success: false 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
