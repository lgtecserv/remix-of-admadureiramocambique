import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase, getDepartmentLabel } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, UserCog } from "lucide-react";
import DepartmentChart from "./DepartmentChart";
import StatusChart from "./StatusChart";
import GrowthChart from "./GrowthChart";
import { DepartmentStatsCard } from "./DepartmentStatsCard";
import { PendingRequestsWidget } from "./PendingRequestsWidget";
import AppLayout from "@/components/layout/AppLayout";
import MemberSearchWidget from "@/components/members/MemberSearchWidget";
import BirthdayAlert from "./BirthdayAlert";
import { useSelectedCongregation } from "@/contexts/SelectedCongregationContext";

interface PastorDashboardProps {
  user: User;
  userEmail?: string;
  explicitRole?: "super_admin" | "pastor" | "secretary";
}

interface Stats {
  total: number;
  byDepartment: Record<string, number>;
}

const PastorDashboard = ({ user, userEmail, explicitRole }: PastorDashboardProps) => {
  const [stats, setStats] = useState<Stats>({ total: 0, byDepartment: {} });
  const [profile, setProfile] = useState<any>(null);
  const [leaderCount, setLeaderCount] = useState(0);
  const { getEffectiveCongregationId } = useSelectedCongregation();

  // Use explicitRole as the source of truth for layout (avoids race condition with context)
  const effectiveRole = explicitRole || "pastor";

  const loadStats = async () => {
    const congId = getEffectiveCongregationId();

    // Build queries with optional congregation filter
    let membersQuery = supabase.from("members").select("department");
    let leadersQuery = supabase
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "leader");

    if (congId) {
      membersQuery = membersQuery.eq("congregation_id", congId);
      leadersQuery = leadersQuery.eq("congregation_id", congId);
    }

    const [membersResult, leadersResult] = await Promise.all([
      membersQuery,
      leadersQuery,
    ]);

    if (membersResult.data) {
      const byDept: Record<string, number> = {};
      membersResult.data.forEach((m) => {
        byDept[m.department] = (byDept[m.department] || 0) + 1;
      });

      setStats({
        total: membersResult.data.length,
        byDepartment: byDept,
      });
    }

    setLeaderCount(leadersResult.count || 0);
  };

  const loadProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    setProfile(data);
  };

  // Reload stats when congregation selection changes
  const congId = getEffectiveCongregationId();

  useEffect(() => {
    Promise.all([loadStats(), loadProfile()]);

    const channel = supabase
      .channel("members-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "members" },
        () => {
          setTimeout(loadStats, 0);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id, congId]);

  const layoutRole = effectiveRole;
  const dashboardTitle = effectiveRole === "super_admin" ? "Painel Super Admin" 
                       : effectiveRole === "secretary" ? "Painel da Secretaria" 
                       : "Painel do Pastor";
  const dashboardSubtitle = (effectiveRole === "super_admin" || effectiveRole === "secretary")
    ? "Visão geral de todas as congregações"
    : "Visão geral completa da igreja";

  return (
    <AppLayout userName={profile?.full_name} role={layoutRole} userEmail={userEmail} user={user}>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">{dashboardTitle}</h2>
          <p className="text-muted-foreground">{dashboardSubtitle}</p>
        </div>

        {/* Widget de Pesquisa de Membros no topo */}
        <MemberSearchWidget />

        {/* Alerta de Aniversariantes */}
        <BirthdayAlert />

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-2 card-hover animate-fade-in stagger-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Membros</CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card className="border-2 card-hover animate-fade-in stagger-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Líderes Ativos</CardTitle>
              <UserCog className="h-5 w-5 text-chart-1" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{leaderCount}</div>
            </CardContent>
          </Card>

          <Card className="border-2 card-hover animate-fade-in stagger-3">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Departamentos</CardTitle>
              <TrendingUp className="h-5 w-5 text-chart-2" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{Object.keys(stats.byDepartment).length}</div>
            </CardContent>
          </Card>
        </div>

        <DepartmentStatsCard />

        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <Card className="shadow-lg animate-fade-in stagger-4">
            <CardHeader>
              <CardTitle>Membros por Departamento</CardTitle>
            </CardHeader>
            <CardContent>
              <DepartmentChart />
            </CardContent>
          </Card>

          <Card className="shadow-lg animate-fade-in stagger-5">
            <CardHeader>
              <CardTitle>Status dos Membros</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusChart />
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Crescimento Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <GrowthChart />
          </CardContent>
        </Card>

        <PendingRequestsWidget />
      </div>
    </AppLayout>
  );
};

export default PastorDashboard;

