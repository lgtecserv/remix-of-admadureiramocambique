import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AttendanceManagement from "@/components/attendance/AttendanceManagement";
import FollowupManagement from "@/components/visitors/FollowupManagement";
import ExportData from "@/components/reports/ExportData";

const Reports = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [department, setDepartment] = useState<string>();
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
        .maybeSingle();

      if (roleData) {
        setRole(roleData.role);
        setDepartment(roleData.department || undefined);
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

  if (!user || !role) {
    return null;
  }

  return (
    <AppLayout role={role} userName={profile?.full_name} user={user}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Relatórios e Acompanhamento</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie presenças, acompanhamentos e exporte dados
          </p>
        </div>

        <Tabs defaultValue="attendance" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="attendance" className="text-xs sm:text-sm py-2">
              Presenças
            </TabsTrigger>
            <TabsTrigger value="followup" className="text-xs sm:text-sm py-2">
              Acompanhamentos
            </TabsTrigger>
            <TabsTrigger value="export" className="text-xs sm:text-sm py-2">
              Exportar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="attendance" className="mt-6">
            <AttendanceManagement
              role={role}
              department={department}
              leaderId={user.id}
            />
          </TabsContent>

          <TabsContent value="followup" className="mt-6">
            <FollowupManagement
              role={role}
              department={department}
              leaderId={user.id}
            />
          </TabsContent>

          <TabsContent value="export" className="mt-6">
            <ExportData role={role} department={department} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Reports;
