import { useEffect, useState } from "react";
import { supabase, getDepartmentLabel } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, UserCheck, UserX, UserPlus } from "lucide-react";

interface DepartmentStats {
  department: string;
  total: number;
  active: number;
  new: number;
  inactive: number;
  leaderName: string;
  growthRate: number;
}

const getDepartmentColor = (department: string): string => {
  const colors: Record<string, string> = {
    jovens: "bg-blue-500",
    irmas: "bg-pink-500",
    varoes: "bg-purple-500",
    adolescentes: "bg-yellow-500",
    criancas: "bg-green-500"
  };
  return colors[department] || "bg-gray-500";
};

export function DepartmentStatsCard() {
  const [stats, setStats] = useState<DepartmentStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Get all members grouped by department
      const { data: members, error: membersError } = await supabase
        .from("members")
        .select("department, status, created_at, leader_id");

      if (membersError) throw membersError;

      // Get all leaders
      const { data: leaders, error: leadersError } = await supabase
        .from("user_roles")
        .select(`
          user_id,
          department,
          profiles!inner(full_name)
        `)
        .eq("role", "leader");

      if (leadersError) throw leadersError;

      // Group members by department
      const departments = ["jovens", "irmas", "varoes", "adolescentes", "criancas"];
      const departmentStats: DepartmentStats[] = [];

      for (const dept of departments) {
        const deptMembers = members?.filter((m) => m.department === dept) || [];
        const total = deptMembers.length;
        const active = deptMembers.filter((m) => m.status === "ativo").length;
        const newMembers = deptMembers.filter((m) => m.status === "novo").length;
        const inactive = deptMembers.filter((m) => m.status === "inativo").length;

        // Find leader for this department
        const leader = leaders?.find((l: any) => l.department === dept);
        const leaderName = leader ? (leader as any).profiles.full_name : "Sem líder";

        // Calculate growth rate (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentMembers = deptMembers.filter(
          (m) => new Date(m.created_at) > thirtyDaysAgo
        ).length;
        const growthRate = total > 0 ? (recentMembers / total) * 100 : 0;

        departmentStats.push({
          department: dept,
          total,
          active,
          new: newMembers,
          inactive,
          leaderName,
          growthRate,
        });
      }

      setStats(departmentStats);
    } catch (error) {
      console.error("Error loading department stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Estatísticas por Departamento</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Estatísticas por Departamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats.map((stat) => (
          <div
            key={stat.department}
            className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getDepartmentColor(stat.department)}`} />
                <h3 className="font-semibold text-lg">{getDepartmentLabel(stat.department)}</h3>
              </div>
              <Badge variant="outline" className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {stat.growthRate.toFixed(0)}%
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xl sm:text-2xl font-bold">{stat.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-green-600">{stat.active}</p>
                  <p className="text-xs text-muted-foreground">Ativos</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-blue-600">{stat.new}</p>
                  <p className="text-xs text-muted-foreground">Novos</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <UserX className="h-4 w-4 text-red-600" />
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-red-600">{stat.inactive}</p>
                  <p className="text-xs text-muted-foreground">Inativos</p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground">
                Líder: <span className="font-medium text-foreground">{stat.leaderName}</span>
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}