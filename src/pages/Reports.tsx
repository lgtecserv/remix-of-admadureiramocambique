import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AttendanceManagement from "@/components/attendance/AttendanceManagement";
import ExportData from "@/components/reports/ExportData";
import MembersPDFReport from "@/components/reports/MembersPDFReport";
import AssetsPDFReport from "@/components/reports/AssetsPDFReport";

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
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Relatórios</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Presenças, acompanhamentos e exportação
          </p>
        </div>

        <Tabs defaultValue="attendance" className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-auto">
            <TabsTrigger value="attendance" className="text-xs sm:text-sm py-2">
              Presenças
            </TabsTrigger>

            <TabsTrigger value="pdf" className="text-xs sm:text-sm py-2">
              PDFs
            </TabsTrigger>
            <TabsTrigger value="export" className="text-xs sm:text-sm py-2">
              CSV
            </TabsTrigger>
          </TabsList>

          <TabsContent value="attendance" className="mt-6">
            <AttendanceManagement
              role={role}
              department={department}
              leaderId={user.id}
            />
          </TabsContent>



          <TabsContent value="pdf" className="mt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Gerar Relatórios em PDF</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <MembersPDFReport role={role} department={department} />
                {(role === "pastor" || role === "super_admin" || department === "patrimonio" || department === "tesouraria") && (
                  <AssetsPDFReport role={role} />
                )}
              </div>
            </div>
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
