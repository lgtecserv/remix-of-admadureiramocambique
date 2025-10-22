import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import PastorDashboard from "@/components/dashboard/PastorDashboard";
import LeaderDashboard from "@/components/dashboard/LeaderDashboard";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);
      setUserEmail(session.user.email || "");

      // Use maybeSingle to avoid errors if role not found yet
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role, department")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (roleError) {
        console.error("Error fetching role:", roleError);
      }

      if (roleData) {
        setRole(roleData.role);
      }

      // Update member statuses (novo -> ativo after 3 months)
      try {
        await supabase.functions.invoke("update-member-status");
      } catch (error) {
        console.error("Error updating member statuses:", error);
      }

      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-primary">Acesso Pendente</h1>
          <p className="text-muted-foreground">
            Aguardando o pastor atribuir suas permissões.
          </p>
        </div>
      </div>
    );
  }

  if (role === "pastor" && user) {
    return <PastorDashboard user={user} userEmail={userEmail} />;
  }

  if (role === "leader" && user) {
    return <LeaderDashboard user={user} userEmail={userEmail} />;
  }

  return null;
};

export default Dashboard;
