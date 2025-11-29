import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase, getDepartmentLabel } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp } from "lucide-react";
import StatusChart from "./StatusChart";
import GrowthChart from "./GrowthChart";
import AppLayout from "@/components/layout/AppLayout";

interface LeaderDashboardProps {
  user: User;
  userEmail?: string;
}

const LeaderDashboard = ({ user, userEmail }: LeaderDashboardProps) => {
  const [department, setDepartment] = useState<string>("");
  const [memberCount, setMemberCount] = useState(0);
  const [profile, setProfile] = useState<any>(null);
  const [activeMembers, setActiveMembers] = useState(0);

  const loadDepartmentInfo = async () => {
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("department")
      .eq("user_id", user.id)
      .single();

    if (roleData?.department) {
      setDepartment(roleData.department);

      const { count } = await supabase
        .from("members")
        .select("*", { count: "exact", head: true })
        .eq("department", roleData.department)
        .eq("leader_id", user.id);

      setMemberCount(count || 0);

      const { count: activeCount } = await supabase
        .from("members")
        .select("*", { count: "exact", head: true })
        .eq("department", roleData.department)
        .eq("leader_id", user.id)
        .eq("status", "ativo");

      setActiveMembers(activeCount || 0);
    }
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
    loadDepartmentInfo();
    loadProfile();

    const channel = supabase
      .channel("member-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "members" },
        () => {
          setTimeout(loadDepartmentInfo, 0);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id]);

  return (
    <AppLayout userName={profile?.full_name} role="leader" department={department} userEmail={userEmail} user={user}>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Painel de {getDepartmentLabel(department)}
          </h2>
          <p className="text-muted-foreground">Gerencie os membros do seu departamento</p>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Membros</CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{memberCount}</div>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Membros Ativos</CardTitle>
              <TrendingUp className="h-5 w-5 text-chart-2" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{activeMembers}</div>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Departamento</CardTitle>
              <Users className="h-5 w-5 text-chart-1" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getDepartmentLabel(department)}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Status dos Membros</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusChart department={department} leaderId={user.id} />
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Crescimento do Departamento</CardTitle>
            </CardHeader>
            <CardContent>
              <GrowthChart department={department} leaderId={user.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default LeaderDashboard;
