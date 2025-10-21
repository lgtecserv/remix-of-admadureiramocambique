import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body
    const { email, password, fullName, department } = await req.json();

    console.log("Creating leader:", { email, fullName, department });

    // Validate inputs
    if (!email || !password || !fullName || !department) {
      throw new Error("Todos os campos são obrigatórios");
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

    // Update profile with email
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ email: email })
      .eq("id", userData.user.id);

    if (profileError) {
      console.error("Error updating profile:", profileError);
    }

    // Insert role immediately
    const { error: roleError } = await supabase.from("user_roles").insert({
      user_id: userData.user.id,
      role: "leader",
      department: department,
    });

    if (roleError) {
      console.error("Error creating role:", roleError);
      // Try to delete the user if role creation fails
      await supabase.auth.admin.deleteUser(userData.user.id);
      throw new Error("Erro ao atribuir role ao líder");
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
