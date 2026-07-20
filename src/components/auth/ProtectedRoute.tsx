import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import PageLoader from "@/components/ui/page-loader";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          if (isMounted) {
            navigate("/auth", { replace: true, state: { from: location.pathname } });
          }
          return;
        }

        if (allowedRoles && allowedRoles.length > 0) {
          const { data: roles, error: rolesError } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", session.user.id);
            
          if (rolesError || !roles) {
            if (isMounted) navigate("/dashboard", { replace: true });
            return;
          }

          const userRoles = roles.map(r => r.role);
          const hasAllowedRole = userRoles.some(r => allowedRoles.includes(r));
          
          if (!hasAllowedRole) {
            if (isMounted) navigate("/dashboard", { replace: true });
            return;
          }
        }

        if (isMounted) {
          setAuthorized(true);
        }
      } catch (error) {
        console.error("Auth check failed", error);
        if (isMounted) navigate("/auth", { replace: true });
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        if (isMounted) {
          setAuthorized(false);
          navigate("/auth", { replace: true });
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, allowedRoles, location.pathname]);

  if (loading) {
    return <PageLoader message="Verificando acesso..." />;
  }

  return authorized ? <>{children}</> : null;
};
