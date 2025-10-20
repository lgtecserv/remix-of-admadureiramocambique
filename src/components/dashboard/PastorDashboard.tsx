import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase, getDepartmentLabel } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, UserCog } from "lucide-react";
import DepartmentChart from "./DepartmentChart";
import StatusChart from "./StatusChart";
import GrowthChart from "./GrowthChart";
import AppLayout from "@/components/layout/AppLayout";

interface PastorDashboardProps {
  user: User;
}

interface Stats {
  total: number;
  byDepartment: Record<string, number>;
}

const PastorDashboard = ({ user }: PastorDashboardProps) => {
  const [stats, setStats] = useState<Stats>({ total: 0, byDepartment: {} });
  const [profile, setProfile] = useState<any>(null);
  const [leaderCount, setLeaderCount] = useState(0);

  const loadStats = async () => {
    const { data: members } = await supabase
      .from("members")
      .select("department");

    if (members) {
      const byDept: Record<string, number> = {};
      members.forEach((m) => {
        byDept[m.department] = (byDept[m.department] || 0) + 1;
      });

      setStats({
        total: members.length,
        byDepartment: byDept,
      });
    }

    const { count } = await supabase
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "leader");

    setLeaderCount(count || 0);
  };

  const loadProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    setProfile(data);
  };

  useEffect(() => {
    loadStats();
    loadProfile();

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
  }, [user.id]);

  return (
    <AppLayout userName={profile?.full_name} role="pastor">
      <div className="space-y-8 animate-fade-in">
        <div>
          <h2 className="text-3xl font-bold text-foreground mb-2">Painel do Pastor</h2>
          <p className="text-muted-foreground">Visão geral completa da igreja</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-2 shadow-lg hover-scale transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Membros</CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Membros ativos na igreja
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover-scale transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Líderes Ativos</CardTitle>
              <UserCog className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent">{leaderCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Líderes de departamentos
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover-scale transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Departamentos</CardTitle>
              <TrendingUp className="h-5 w-5 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-secondary">
                {Object.keys(stats.byDepartment).length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Áreas de ministério
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Membros por Departamento</CardTitle>
            </CardHeader>
            <CardContent>
              <DepartmentChart />
            </CardContent>
          </Card>

          <Card className="shadow-lg">
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
      </div>
    </AppLayout>
  );
};

export default PastorDashboard;
