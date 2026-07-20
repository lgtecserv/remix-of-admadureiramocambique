import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import AppLayout from "@/components/layout/AppLayout";
import CongregadosManagement from "@/components/members/CongregadosManagement";
import MembersFilter from "@/components/members/MembersFilter";
import CreateMemberButton from "@/components/members/CreateMemberButton";
import PageLoader from "@/components/ui/page-loader";
import { useSelectedCongregation } from "@/contexts/SelectedCongregationContext";

const Congregados = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ full_name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);

      // Carregar role e profile em paralelo
      const [roleResult, profileResult] = await Promise.all([
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .single(),
        supabase
          .from("profiles")
          .select("full_name")
          .eq("id", session.user.id)
          .single(),
      ]);

      if (roleResult.data) {
        setRole(roleResult.data.role);
      }

      if (profileResult.data) {
        setProfile(profileResult.data);
      }

      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  const { isSuperAdmin } = useSelectedCongregation();

  if (loading) {
    return <PageLoader message="Carregando congregados..." />;
  }

  const effectiveRole = isSuperAdmin ? (role === "secretary" ? "secretary" : "super_admin") : role;
  const isReadOnlySuper = role === "super_admin"; // só super admin é somente leitura
  const canCreate = role === "leader" || role === "secretary";

  return (
    <AppLayout userName={profile?.full_name} role={effectiveRole || undefined}>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Gestão de Congregados</h1>
            <p className="text-sm text-muted-foreground">
              {isReadOnlySuper
                ? "Visualize os congregados de todas as congregações"
                : role === "secretary"
                  ? "Gerencie os congregados de todas as congregações"
                  : `Gerencie os congregados ${role === "leader" ? "do seu departamento" : "da igreja"}`}
            </p>
          </div>
          {canCreate && (
            <div className="w-full sm:w-auto [&>button]:w-full sm:[&>button]:w-auto">
              <CreateMemberButton role={role} onSuccess={() => setCreateDialogOpen(false)} defaultType="congregado" />
            </div>
          )}
        </div>

        <MembersFilter
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          departmentFilter={departmentFilter}
          onDepartmentFilterChange={setDepartmentFilter}
          showDepartmentFilter={role === "pastor" || isSuperAdmin}
        />

        <CongregadosManagement
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          departmentFilter={departmentFilter}
        />
      </div>
    </AppLayout>
  );
};

export default Congregados;
