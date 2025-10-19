import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import AppLayout from "@/components/layout/AppLayout";
import StatisticsCard from "@/components/dashboard/StatisticsCard";
import DepartmentChart from "@/components/dashboard/DepartmentChart";
import StatusChart from "@/components/dashboard/StatusChart";
import GrowthChart from "@/components/dashboard/GrowthChart";
import { Users, TrendingUp, UserPlus, Activity, Loader2 } from "lucide-react";
import { getDepartmentLabel, getStatusLabel } from "@/lib/supabase";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ full_name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    novos: 0,
    ativos: 0,
    inativos: 0,
  });
  const [departmentData, setDepartmentData] = useState<{ name: string; value: number }[]>([]);
  const [statusData, setStatusData] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);

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
        await loadStats(roleData.role, roleData.department);
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
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

  const loadStats = async (userRole: string, userDepartment: any) => {
    let query = supabase.from("members").select("department, status");

    if (userRole === "leader" && userDepartment) {
      query = query.eq("department", userDepartment as any);
    }

    const { data: members } = await query;

    if (members) {
      const total = members.length;
      const novos = members.filter(m => m.status === "novo").length;
      const ativos = members.filter(m => m.status === "ativo").length;
      const inativos = members.filter(m => m.status === "inativo").length;

      setStats({ total, novos, ativos, inativos });

      // Department data (only for pastor)
      if (userRole === "pastor") {
        const deptCounts = members.reduce((acc: any, member) => {
          const dept = getDepartmentLabel(member.department);
          acc[dept] = (acc[dept] || 0) + 1;
          return acc;
        }, {});

        setDepartmentData(
          Object.entries(deptCounts).map(([name, value]) => ({ name, value: value as number }))
        );
      }

      // Status data
      const statusCounts = members.reduce((acc: any, member) => {
        const status = getStatusLabel(member.status);
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      setStatusData(
        Object.entries(statusCounts).map(([name, value]) => ({ name, value: value as number }))
      );
    }
  };

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

  return (
    <AppLayout userName={profile?.full_name}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral {role === "leader" ? "do seu departamento" : "da igreja"}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatisticsCard
            title="Total de Membros"
            value={stats.total}
            icon={Users}
            trend={{ value: 12, isPositive: true }}
          />
          <StatisticsCard
            title="Novos Membros"
            value={stats.novos}
            icon={UserPlus}
            description="Últimos 30 dias"
          />
          <StatisticsCard
            title="Membros Ativos"
            value={stats.ativos}
            icon={Activity}
            trend={{ value: 8, isPositive: true }}
          />
          <StatisticsCard
            title="Taxa de Crescimento"
            value="12%"
            icon={TrendingUp}
            description="vs mês anterior"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {role === "pastor" && departmentData.length > 0 && (
            <DepartmentChart data={departmentData} />
          )}
          {statusData.length > 0 && <StatusChart data={statusData} />}
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
