import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase, getDepartmentLabel } from "@/lib/supabase";
import Header from "./Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import MemberManagement from "@/components/members/MemberManagement";
import CreateMemberForm from "@/components/members/CreateMemberForm";

interface LeaderDashboardProps {
  user: User;
}

const LeaderDashboard = ({ user }: LeaderDashboardProps) => {
  const [department, setDepartment] = useState<string>("");
  const [memberCount, setMemberCount] = useState(0);
  const [profile, setProfile] = useState<any>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

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
    <>
      <Header userName={profile?.full_name} />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-primary mb-2">
            Painel de {getDepartmentLabel(department)}
          </h2>
          <p className="text-muted-foreground">Gerencie os membros do seu departamento</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card className="border-2 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Meus Membros</CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{memberCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Membros cadastrados
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Departamento</CardTitle>
              <Users className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getDepartmentLabel(department)}</div>
              <p className="text-xs text-muted-foreground mt-1">Sua área de responsabilidade</p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl">Gestão de Membros</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Cadastre e gerencie os membros do seu departamento
              </p>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Adicionar Membro
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cadastrar Novo Membro</DialogTitle>
                </DialogHeader>
                <CreateMemberForm
                  department={department}
                  leaderId={user.id}
                  onSuccess={() => setCreateDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <MemberManagement department={department} leaderId={user.id} />
          </CardContent>
        </Card>
      </main>
    </>
  );
};

export default LeaderDashboard;
