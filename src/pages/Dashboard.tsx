import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import PageLoader from "@/components/ui/page-loader";
import PastorDashboard from "@/components/dashboard/PastorDashboard";
import LeaderDashboard from "@/components/dashboard/LeaderDashboard";
import PatrimonioDashboard from "@/components/dashboard/PatrimonioDashboard";
import TesourariaDashboard from "@/components/dashboard/TesourariaDashboard";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [department, setDepartment] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [dataReady, setDataReady] = useState(false);

  const fetchUserRole = useCallback(async (userId: string) => {
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role, department")
      .eq("user_id", userId)
      .maybeSingle();

    if (roleError) {
      console.error("Error fetching role:", roleError);
      return null;
    }

    return roleData;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      // Reset estados para evitar dados antigos
      setRole(null);
      setDepartment(null);
      setDataReady(false);
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      if (!isMounted) return;

      setUser(session.user);
      setUserEmail(session.user.email || "");

      // Carregar role e atualizar status em paralelo
      const [roleData] = await Promise.all([
        fetchUserRole(session.user.id),
        supabase.functions.invoke("update-member-status").catch((error) => {
          console.error("Error updating member statuses:", error);
        }),
      ]);

      if (!isMounted) return;

      if (roleData) {
        setRole(roleData.role);
        setDepartment(roleData.department);
      }

      setDataReady(true);
      setLoading(false);
    };

    checkAuth();

    // Listener para mudanças de autenticação - apenas SIGNED_OUT
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT" || !session) {
          setUser(null);
          setRole(null);
          setDepartment(null);
          setDataReady(false);
          navigate("/auth");
        }
        // Ignorar TOKEN_REFRESHED para evitar loop infinito
      }
    );

    return () => {
      isMounted = false;
      authSubscription.unsubscribe();
    };
  }, [navigate, fetchUserRole]);

  // Listener para mudanças em user_roles em tempo real
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`user-role-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_roles",
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          if (payload.eventType === "UPDATE" || payload.eventType === "INSERT") {
            const newData = payload.new as { role: string; department: string | null };
            setRole(newData.role);
            setDepartment(newData.department);
          } else if (payload.eventType === "DELETE") {
            setRole(null);
            setDepartment(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Só renderiza quando loading terminou E dados estão prontos
  if (loading || !dataReady) {
    return <PageLoader message="Carregando painel..." />;
  }

  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 animate-fade-in">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-primary">Acesso Pendente</h1>
          <p className="text-muted-foreground">
            Aguardando o pastor atribuir suas permissões.
          </p>
        </div>
      </div>
    );
  }

  if ((role === "super_admin" || role === "super-admin") && user) {
    return <PastorDashboard user={user} userEmail={userEmail} explicitRole="super_admin" />;
  }

  if (role === "secretary" && user) {
    return <PastorDashboard user={user} userEmail={userEmail} explicitRole="secretary" />;
  }

  // Renderização baseada em role e department - ordem importa!
  if (role === "pastor" && user) {
    return <PastorDashboard user={user} userEmail={userEmail} explicitRole="pastor" />;
  }

  if (role === "leader" && user) {
    // Verificação explícita do department para evitar confusão
    if (department === "patrimonio") {
      return <PatrimonioDashboard user={user} userEmail={userEmail} />;
    }
    if (department === "tesouraria") {
      return <TesourariaDashboard user={user} userEmail={userEmail} />;
    }
    // Outros departamentos usam o LeaderDashboard padrão
    return <LeaderDashboard user={user} userEmail={userEmail} />;
  }

  return null;
};

export default Dashboard;
