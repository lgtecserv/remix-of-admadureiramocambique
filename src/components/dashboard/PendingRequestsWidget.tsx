import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";

interface AssetRequest {
  id: string;
  asset_id: string;
  quantity: number;
  purpose: string;
  status: string;
  requested_by: string;
  created_at: string;
  church_assets: {
    name: string;
  };
  profiles: {
    full_name: string;
  };
}

export const PendingRequestsWidget = () => {
  const [pendingRequests, setPendingRequests] = useState<AssetRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPendingRequests();

    const channel = supabase
      .channel("pending-requests-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "asset_requests" },
        () => loadPendingRequests()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadPendingRequests = async () => {
    const { data, error } = await supabase
      .from("asset_requests")
      .select(`
        *,
        church_assets(name)
      `)
      .eq("status", "pendente")
      .order("created_at", { ascending: false })
      .limit(5);

    if (!data) {
      setLoading(false);
      return;
    }

    // Buscar os nomes dos solicitantes separadamente
    const userIds = data.map(r => r.requested_by);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    const profilesMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

    const enrichedData = data.map(request => ({
      ...request,
      profiles: {
        full_name: profilesMap.get(request.requested_by) || "Usuário"
      }
    }));

    setPendingRequests(enrichedData);
    setLoading(false);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            Solicitações Pendentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-500" />
          Solicitações Pendentes
          {pendingRequests.length > 0 && (
            <Badge variant="destructive" className="ml-auto">
              {pendingRequests.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pendingRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma solicitação pendente</p>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((request) => (
              <div key={request.id} className="flex items-start justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-sm">{request.church_assets.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Solicitado por: {request.profiles.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Quantidade: {request.quantity}
                  </p>
                </div>
                <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                  Pendente
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
