import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, UserPlus, Users, UserCheck } from "lucide-react";
import CreateVisitorForm from "@/components/visitors/CreateVisitorForm";
import VisitorManagement from "@/components/visitors/VisitorManagement";
import { DateRangeFilter, DateRange } from "@/components/common/DateRangeFilter";

const Visitors = () => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string>("");
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    returned: 0,
    firstTime: 0,
  });
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role, department")
        .eq("user_id", user.id)
        .single();

      if (!roleData) {
        navigate("/auth");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      setUser(user);
      setRole(roleData.role);
      setProfile({ ...profileData, department: roleData.department });
      setLoading(false);
    };

    checkUser();
  }, [navigate]);

  useEffect(() => {
    const loadStats = async () => {
      let query = supabase.from("visitors").select("*");

      if (role === "leader" && profile?.department) {
        query = query.eq("department", profile.department as any);
      }

      const { data } = await query;

      if (data) {
        setStats({
          total: data.length,
          returned: data.filter((v) => v.returned).length,
          firstTime: data.filter((v) => !v.returned).length,
        });
      }
    };

    if (user && role) {
      loadStats();
    }
  }, [user, role, profile, dialogOpen]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout userName={profile?.full_name} role={role}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Visitantes</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie os visitantes {role === "leader" ? `do departamento de ${profile?.department}` : "da igreja"}
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Cadastrar Visitante
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Visitante</DialogTitle>
              </DialogHeader>
              <CreateVisitorForm
                onSuccess={() => setDialogOpen(false)}
                user={user!}
                userDepartment={role === "leader" ? profile?.department : undefined}
              />
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Visitantes</CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Primeira Visita</CardTitle>
              <UserPlus className="h-5 w-5 text-chart-1" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.firstTime}</div>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Retornaram</CardTitle>
              <UserCheck className="h-5 w-5 text-chart-2" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.returned}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.total > 0 ? `${Math.round((stats.returned / stats.total) * 100)}% de conversão` : ""}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Lista de Visitantes</CardTitle>
                <CardDescription>
                  Gerencie e acompanhe todos os visitantes cadastrados
                </CardDescription>
              </div>
              <DateRangeFilter onDateRangeChange={setDateRange} />
            </div>
          </CardHeader>
          <CardContent>
            <VisitorManagement
              userRole={role}
              userDepartment={profile?.department}
              userId={user?.id}
              dateRange={dateRange}
            />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Visitors;
