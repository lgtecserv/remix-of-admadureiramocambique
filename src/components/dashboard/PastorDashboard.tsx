import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase, getDepartmentLabel } from "@/lib/supabase";
import Header from "./Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import LeaderManagement from "@/components/leaders/LeaderManagement";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import CreateLeaderForm from "@/components/leaders/CreateLeaderForm";

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
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

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
    <>
      <Header userName={profile?.full_name} />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-primary mb-2">Painel do Pastor</h2>
          <p className="text-muted-foreground">Visão geral da igreja</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card className="border-2 shadow-lg">
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

          {Object.entries(stats.byDepartment).map(([dept, count]) => (
            <Card key={dept} className="shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {getDepartmentLabel(dept)}
                </CardTitle>
                <Users className="h-5 w-5 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{count}</div>
                <p className="text-xs text-muted-foreground mt-1">Membros</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl">Gestão de Líderes</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Cadastre e gerencie os líderes de departamentos
              </p>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Adicionar Líder
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cadastrar Novo Líder</DialogTitle>
                </DialogHeader>
                <CreateLeaderForm onSuccess={() => setCreateDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <LeaderManagement />
          </CardContent>
        </Card>
      </main>
    </>
  );
};

export default PastorDashboard;
