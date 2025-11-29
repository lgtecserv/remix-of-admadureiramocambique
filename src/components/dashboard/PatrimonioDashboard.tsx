import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertCircle, Clock } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";

interface PatrimonioDashboardProps {
  user: User;
  userEmail?: string;
}

const PatrimonioDashboard = ({ user, userEmail }: PatrimonioDashboardProps) => {
  const [totalItems, setTotalItems] = useState(0);
  const [goodCondition, setGoodCondition] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [profile, setProfile] = useState<any>(null);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);

  const loadStats = async () => {
    // Total de itens
    const { count: totalCount } = await supabase
      .from("church_assets")
      .select("*", { count: "exact", head: true })
      .eq("leader_id", user.id);

    setTotalItems(totalCount || 0);

    // Itens em bom estado
    const { count: goodCount } = await supabase
      .from("church_assets")
      .select("*", { count: "exact", head: true })
      .eq("leader_id", user.id)
      .eq("condition", "perfeito");

    setGoodCondition(goodCount || 0);

    // Solicitações pendentes
    const { count: pendingCount } = await supabase
      .from("asset_requests")
      .select("*", { count: "exact", head: true })
      .eq("requested_by", user.id)
      .eq("status", "pendente");

    setPendingRequests(pendingCount || 0);

    // Últimas solicitações
    const { data: requestsData } = await supabase
      .from("asset_requests")
      .select(`
        *,
        church_assets(name)
      `)
      .eq("requested_by", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    setRecentRequests(requestsData || []);
  };

  const loadProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    setProfile(data);
  };

  useEffect(() => {
    loadStats();
    loadProfile();

    const channel = supabase
      .channel("patrimonio-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "church_assets" },
        () => loadStats()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "asset_requests" },
        () => loadStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pendente":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
      case "aprovado":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "rejeitado":
        return "bg-red-500/10 text-red-700 dark:text-red-400";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
    }
  };

  return (
    <AppLayout userName={profile?.full_name} role="leader" department="patrimonio" userEmail={userEmail} user={user}>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Painel de Patrimônio
          </h2>
          <p className="text-muted-foreground">Gerencie os materiais e recursos da igreja</p>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Itens</CardTitle>
              <Package className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalItems}</div>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Perfeito Estado</CardTitle>
              <AlertCircle className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{goodCondition}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalItems > 0 ? Math.round((goodCondition / totalItems) * 100) : 0}% do total
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Solicitações Pendentes</CardTitle>
              <Clock className="h-5 w-5 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{pendingRequests}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Últimas Solicitações</CardTitle>
          </CardHeader>
          <CardContent>
            {recentRequests.length > 0 ? (
              <div className="space-y-4">
                {recentRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{request.church_assets?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Quantidade: {request.quantity} • {request.purpose}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(request.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <Badge className={getStatusColor(request.status)}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma solicitação registrada ainda
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default PatrimonioDashboard;
