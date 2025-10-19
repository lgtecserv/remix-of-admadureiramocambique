import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import AppLayout from "@/components/layout/AppLayout";
import DepartmentChart from "@/components/dashboard/DepartmentChart";
import StatusChart from "@/components/dashboard/StatusChart";
import GrowthChart from "@/components/dashboard/GrowthChart";
import { Loader2 } from "lucide-react";
import { getDepartmentLabel, getStatusLabel } from "@/lib/supabase";

const Statistics = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ full_name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [departmentData, setDepartmentData] = useState<{ name: string; value: number }[]>([]);
  const [statusData, setStatusData] = useState<{ name: string; value: number }[]>([]);
  const [growthData, setGrowthData] = useState<{ month: string; total: number; novos: number }[]>([]);

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
        await loadStatistics(roleData.role, roleData.department);
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

  const loadStatistics = async (userRole: string, userDepartment: string | null) => {
    // Load department distribution
    const { data: members } = await supabase
      .from("members")
      .select("department, status")
      .eq(userRole === "leader" ? "department" : "id", userRole === "leader" ? userDepartment : "id");

    if (members) {
      // Department data
      const deptCounts = members.reduce((acc: any, member) => {
        const dept = getDepartmentLabel(member.department);
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
      }, {});

      setDepartmentData(
        Object.entries(deptCounts).map(([name, value]) => ({ name, value: value as number }))
      );

      // Status data
      const statusCounts = members.reduce((acc: any, member) => {
        const status = getStatusLabel(member.status);
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      setStatusData(
        Object.entries(statusCounts).map(([name, value]) => ({ name, value: value as number }))
      );
    }

    // Growth data (last 6 months)
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"];
    const mockGrowthData = months.map((month, index) => ({
      month,
      total: 50 + index * 10,
      novos: 5 + index * 2,
    }));
    setGrowthData(mockGrowthData);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout userName={profile?.full_name}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Estatísticas</h1>
          <p className="text-muted-foreground">Análise detalhada dos dados</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {role === "pastor" && departmentData.length > 0 && (
            <DepartmentChart data={departmentData} />
          )}
          {statusData.length > 0 && <StatusChart data={statusData} />}
          {growthData.length > 0 && (
            <div className="lg:col-span-2">
              <GrowthChart data={growthData} />
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Statistics;
