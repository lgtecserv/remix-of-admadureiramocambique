import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { AssetManagement } from "@/components/patrimonio/AssetManagement";

const PatrimonioMateriais = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [userDepartment, setUserDepartment] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role, department")
        .eq("user_id", session.user.id)
        .single();

      const isSuperAdminOrSecretary = roleData.role === "super_admin" || roleData.role === "secretary";
      if (!roleData || (!isSuperAdminOrSecretary && roleData.department !== "patrimonio")) {
        navigate("/dashboard");
        return;
      }

      setUserRole(roleData.role);
      setUserDepartment(roleData.department || "");

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", session.user.id)
        .single();

      setProfile(profileData);
      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout userName={profile?.full_name} role={userRole} department={userDepartment} userEmail={user?.email} user={user}>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Gestão de Materiais
          </h2>
          <p className="text-muted-foreground">
            Cadastre e gerencie os materiais da igreja
          </p>
        </div>

        <AssetManagement />
      </div>
    </AppLayout>
  );
};

export default PatrimonioMateriais;
