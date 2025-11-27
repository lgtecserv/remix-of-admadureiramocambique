import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import AppLayout from "@/components/layout/AppLayout";
import DepartmentChart from "@/components/dashboard/DepartmentChart";
import StatusChart from "@/components/dashboard/StatusChart";
import GrowthChart from "@/components/dashboard/GrowthChart";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Statistics = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [department, setDepartment] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ full_name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role, department")
        .eq("user_id", session.user.id)
        .single();

      if (roleData) {
        setRole(roleData.role);
        setDepartment(roleData.department);
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", session.user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout userName={profile?.full_name} role={role || undefined}>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Estatísticas</h1>
          <p className="text-muted-foreground">Análise detalhada dos dados</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {role === "pastor" && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Membros por Departamento</CardTitle>
              </CardHeader>
              <CardContent>
                <DepartmentChart />
              </CardContent>
            </Card>
          )}
          
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Status dos Membros</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusChart 
                department={role === "leader" ? (department || undefined) : undefined}
                leaderId={role === "leader" ? user?.id : undefined}
              />
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Crescimento Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <GrowthChart 
              department={role === "leader" ? (department || undefined) : undefined}
              leaderId={role === "leader" ? user?.id : undefined}
            />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Statistics;
