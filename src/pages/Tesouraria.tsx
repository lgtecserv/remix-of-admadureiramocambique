import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OfferingsManagement } from "@/components/tesouraria/OfferingsManagement";
import { TithesManagement } from "@/components/tesouraria/TithesManagement";
import { ExpensesManagement } from "@/components/tesouraria/ExpensesManagement";
import { FinancialReport } from "@/components/tesouraria/FinancialReport";
import { BalanceAdjustment } from "@/components/tesouraria/BalanceAdjustment";
import { RequestApproval } from "@/components/tesouraria/RequestApproval";
import { PatrimonioOverview } from "@/components/tesouraria/PatrimonioOverview";
import { Badge } from "@/components/ui/badge";

const Tesouraria = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

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

      if (!roleData || roleData.department !== "tesouraria") {
        navigate("/dashboard");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", session.user.id)
        .single();

      setProfile(profileData);
      
      // Buscar solicitações pendentes
      const { data: pendingData } = await supabase
        .from("asset_requests")
        .select("id", { count: "exact", head: false })
        .eq("status", "pendente");
      
      setPendingCount(pendingData?.length || 0);
      setLoading(false);
    };

    checkAuth();

    // Real-time updates para contagem de pendentes
    const channel = supabase
      .channel('pending_requests_count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'asset_requests'
        },
        async () => {
          const { data } = await supabase
            .from("asset_requests")
            .select("id", { count: "exact", head: false })
            .eq("status", "pendente");
          setPendingCount(data?.length || 0);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout userName={profile?.full_name} role="leader" department="tesouraria" userEmail={user?.email} user={user}>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Gestão de Tesouraria
          </h2>
          <p className="text-muted-foreground">
            Gerencie as finanças da igreja
          </p>
        </div>

        <Tabs defaultValue="offerings" className="w-full">
          <TabsList className="flex w-full overflow-x-auto">
            <TabsTrigger value="offerings" className="flex-1 min-w-[100px]">Ofertas</TabsTrigger>
            <TabsTrigger value="tithes" className="flex-1 min-w-[100px]">Dízimos</TabsTrigger>
            <TabsTrigger value="expenses" className="flex-1 min-w-[100px]">Gastos</TabsTrigger>
            <TabsTrigger value="adjustments" className="flex-1 min-w-[100px]">Ajustes</TabsTrigger>
            <TabsTrigger value="report" className="flex-1 min-w-[100px]">Relatório</TabsTrigger>
            <TabsTrigger value="requests" className="flex-1 min-w-[100px]">
              Solicitações
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 min-w-[20px] px-1 text-xs">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex-1 min-w-[100px]">Inventário</TabsTrigger>
          </TabsList>

          <TabsContent value="offerings" className="space-y-4">
            <OfferingsManagement />
          </TabsContent>

          <TabsContent value="tithes" className="space-y-4">
            <TithesManagement />
          </TabsContent>

          <TabsContent value="expenses" className="space-y-4">
            <ExpensesManagement />
          </TabsContent>

          <TabsContent value="adjustments" className="space-y-4">
            <BalanceAdjustment />
          </TabsContent>

          <TabsContent value="report" className="space-y-4">
            <FinancialReport />
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            <RequestApproval />
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4">
            <PatrimonioOverview />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Tesouraria;
