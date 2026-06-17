import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface SelectedCongregationContextType {
  /** ID da congregação selecionada no filtro, ou "all" para super admin */
  selectedCongregationId: string | null;
  setSelectedCongregationId: (id: string | null) => void;
  /** ID da congregação "natural" do usuário (via user_roles ou congregation_pastors) */
  userCongregationId: string | null;
  /** Role do usuário logado */
  userRole: string | null;
  /** Departamento do usuário (para líderes) */
  userDepartment: string | null;
  /** Se o usuário é super admin */
  isSuperAdmin: boolean;
  /** Se o contexto está carregando */
  loading: boolean;
  /** Retorna o ID efetivo para usar em queries (null = sem filtro, i.e. todas) */
  getEffectiveCongregationId: () => string | null;
}

const SelectedCongregationContext = createContext<SelectedCongregationContextType | undefined>(undefined);

export const SelectedCongregationProvider = ({ children }: { children: ReactNode }) => {
  const [selectedCongregationId, setSelectedCongregationId] = useState<string | null>(null);
  const [userCongregationId, setUserCongregationId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userDepartment, setUserDepartment] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const normalizedRole = userRole?.trim()?.toLowerCase();
  const isSuperAdmin = normalizedRole === "super_admin" || normalizedRole === "super-admin" || normalizedRole === "secretary" || normalizedRole === "secretário" || normalizedRole === "secretario" || normalizedRole === "admin";

  useEffect(() => {
    let isMounted = true;

    const loadUserContext = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isMounted) {
        setLoading(false);
        return;
      }

      // Buscar role do usuário
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role, department, congregation_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (roleData) {
        setUserRole(roleData.role);
        setUserDepartment(roleData.department);

        const rRole = roleData.role?.trim()?.toLowerCase();
        if (rRole === "super_admin" || rRole === "super-admin" || rRole === "secretary" || rRole === "secretário" || rRole === "secretario" || rRole === "admin") {
          // Super admin / Secretário começam com "all" (acesso global)
          setSelectedCongregationId("all");
          setUserCongregationId(null);
        } else if (roleData.congregation_id) {
          // Leader com congregation_id direto
          setUserCongregationId(roleData.congregation_id);
          setSelectedCongregationId(roleData.congregation_id);
        } else if (roleData.role === "pastor") {
          // Pastor busca da tabela congregation_pastors
          const { data: cp } = await supabase
            .from("congregation_pastors")
            .select("congregation_id")
            .eq("pastor_id", user.id)
            .order("is_titular", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!isMounted) return;

          if (cp?.congregation_id) {
            setUserCongregationId(cp.congregation_id);
            setSelectedCongregationId(cp.congregation_id);
          }
        }
      }

      setLoading(false);
    };

    loadUserContext();

    // Listener para sign out
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setSelectedCongregationId(null);
        setUserCongregationId(null);
        setUserRole(null);
        setUserDepartment(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const getEffectiveCongregationId = useCallback(() => {
    if (selectedCongregationId === "all") return null;
    return selectedCongregationId;
  }, [selectedCongregationId]);

  return (
    <SelectedCongregationContext.Provider
      value={{
        selectedCongregationId,
        setSelectedCongregationId,
        userCongregationId,
        userRole,
        userDepartment,
        isSuperAdmin,
        loading,
        getEffectiveCongregationId,
      }}
    >
      {children}
    </SelectedCongregationContext.Provider>
  );
};

export const useSelectedCongregation = () => {
  const context = useContext(SelectedCongregationContext);
  if (!context) {
    throw new Error("useSelectedCongregation must be used within SelectedCongregationProvider");
  }
  return context;
};
