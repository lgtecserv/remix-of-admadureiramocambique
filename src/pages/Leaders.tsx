import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import CreateLeaderForm from "@/components/leaders/CreateLeaderForm";
import LeaderManagement from "@/components/leaders/LeaderManagement";

const Leaders = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string>("");
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate("/auth");
        return;
      }

      setUser(user);

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      // Check if user is super admin
      const { data: isSuperAdmin } = await supabase.rpc("is_super_admin", {
        _user_id: user.id,
      });

      // Allow access to pastor or super admin
      if (roleData?.role !== "pastor" && !isSuperAdmin) {
        navigate("/dashboard");
        return;
      }

      setRole(roleData?.role || "pastor");

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      setProfile(profileData);
      setLoading(false);
    };

    checkUser();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AppLayout userName={profile?.full_name} role={role}>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h2 className="text-3xl font-bold text-foreground mb-2">Gestão de Líderes</h2>
          <p className="text-muted-foreground">Cadastre e gerencie os líderes de departamentos</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl">Líderes Cadastrados</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Visualize e gerencie todos os líderes da igreja
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
      </div>
    </AppLayout>
  );
};

export default Leaders;
