import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, Package, Clock, AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Asset {
  id: string;
  name: string;
  quantity: number;
}

interface Request {
  id: string;
  asset_id: string;
  quantity: number;
  purpose: string;
  status: string;
  created_at: string;
  image_url: string | null;
  approval_comment: string | null;
  requested_by: string;
  church_assets: Asset;
}

interface Profile {
  full_name: string;
}

export const RequestApproval = () => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<Request[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("pendente");
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject">("approve");
  const [comment, setComment] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadRequests();

    // Real-time updates
    const channel = supabase
      .channel('asset_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'asset_requests'
        },
        () => {
          loadRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (statusFilter === "all") {
      setFilteredRequests(requests);
    } else {
      setFilteredRequests(requests.filter(req => req.status === statusFilter));
    }
  }, [statusFilter, requests]);

  const loadRequests = async () => {
    try {
      const { data: requestsData, error: requestsError } = await supabase
        .from("asset_requests")
        .select(`
          *,
          church_assets (
            id,
            name,
            quantity
          )
        `)
        .order("created_at", { ascending: false });

      if (requestsError) throw requestsError;

      // Buscar perfis dos solicitantes
      const userIds = [...new Set(requestsData?.map(r => r.requested_by) || [])];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const profilesMap: Record<string, Profile> = {};
      profilesData?.forEach(p => {
        profilesMap[p.id] = { full_name: p.full_name };
      });

      setProfiles(profilesMap);
      setRequests(requestsData || []);
      setFilteredRequests(requestsData?.filter(r => r.status === statusFilter) || []);
    } catch (error: any) {
      toast.error("Erro ao carregar solicitações", {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (request: Request, action: "approve" | "reject") => {
    setSelectedRequest(request);
    setActionType(action);
    setComment("");
    setActionDialogOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedRequest) return;

    setProcessing(true);
    try {
      const newStatus = actionType === "approve" ? "aprovado" : "rejeitado";
      
      const { error } = await supabase
        .from("asset_requests")
        .update({
          status: newStatus,
          approval_comment: comment || null
        })
        .eq("id", selectedRequest.id);

      if (error) throw error;

      toast.success(
        actionType === "approve" ? "Solicitação aprovada" : "Solicitação rejeitada",
        {
          description: `${selectedRequest.church_assets.name} - ${selectedRequest.quantity} unidade(s)`
        }
      );

      setActionDialogOpen(false);
      setSelectedRequest(null);
      setComment("");
    } catch (error: any) {
      toast.error("Erro ao processar solicitação", {
        description: error.message
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string; icon: any }> = {
      pendente: { 
        label: "Pendente", 
        className: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
        icon: Clock
      },
      aprovado: { 
        label: "Aprovado", 
        className: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
        icon: CheckCircle
      },
      rejeitado: { 
        label: "Rejeitado", 
        className: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
        icon: XCircle
      }
    };
    return variants[status] || variants.pendente;
  };

  const stats = {
    pending: requests.filter(r => r.status === "pendente").length,
    approved: requests.filter(r => r.status === "aprovado").length,
    rejected: requests.filter(r => r.status === "rejeitado").length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com Estatísticas */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pendentes</CardDescription>
            <CardTitle className="text-2xl text-yellow-600">{stats.pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Aprovadas</CardDescription>
            <CardTitle className="text-2xl text-green-600">{stats.approved}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Rejeitadas</CardDescription>
            <CardTitle className="text-2xl text-red-600">{stats.rejected}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Solicitações do Patrimônio</h3>
          <p className="text-sm text-muted-foreground">Aprovar ou rejeitar pedidos</p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pendente">Pendentes</SelectItem>
            <SelectItem value="aprovado">Aprovadas</SelectItem>
            <SelectItem value="rejeitado">Rejeitadas</SelectItem>
            <SelectItem value="all">Todas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de Solicitações */}
      {filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma solicitação encontrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredRequests.map((request) => {
            const statusBadge = getStatusBadge(request.status);
            const StatusIcon = statusBadge.icon;
            const available = request.church_assets.quantity;
            const hasStock = available >= request.quantity;

            return (
              <Card key={request.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{request.church_assets.name}</CardTitle>
                      <CardDescription className="text-sm">
                        Solicitado por: {profiles[request.requested_by]?.full_name || "Desconhecido"}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className={statusBadge.className}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusBadge.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {request.image_url && (
                    <div className="aspect-video w-full overflow-hidden rounded-md bg-muted">
                      <img
                        src={request.image_url}
                        alt={request.church_assets.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Quantidade solicitada:</span>
                      <span className="font-medium">{request.quantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Disponível em estoque:</span>
                      <span className={`font-medium ${hasStock ? "text-green-600" : "text-red-600"}`}>
                        {available}
                      </span>
                    </div>
                    {!hasStock && (
                      <div className="flex items-center gap-2 text-xs text-red-600 bg-red-500/10 p-2 rounded">
                        <AlertTriangle className="h-4 w-4" />
                        Estoque insuficiente
                      </div>
                    )}
                    <div className="pt-2 border-t">
                      <span className="text-muted-foreground">Finalidade:</span>
                      <p className="mt-1">{request.purpose}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Data da solicitação:</span>
                      <p className="mt-1">
                        {format(new Date(request.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    {request.approval_comment && (
                      <div className="pt-2 border-t">
                        <span className="text-muted-foreground">Comentário:</span>
                        <p className="mt-1 text-sm">{request.approval_comment}</p>
                      </div>
                    )}
                  </div>

                  {request.status === "pendente" && (
                    <div className="flex gap-2 pt-4">
                      <Button
                        variant="default"
                        className="flex-1"
                        onClick={() => handleActionClick(request, "approve")}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Aprovar
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => handleActionClick(request, "reject")}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Rejeitar
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog de Confirmação */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Aprovar Solicitação" : "Rejeitar Solicitação"}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <>
                  {selectedRequest.church_assets.name} - {selectedRequest.quantity} unidade(s)
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="comment">
                Comentário {actionType === "reject" ? "(obrigatório)" : "(opcional)"}
              </Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Adicione um comentário sobre esta decisão..."
                className="min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialogOpen(false)}
              disabled={processing}
            >
              Cancelar
            </Button>
            <Button
              variant={actionType === "approve" ? "default" : "destructive"}
              onClick={handleConfirmAction}
              disabled={processing || (actionType === "reject" && !comment.trim())}
            >
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {actionType === "approve" ? "Aprovar" : "Rejeitar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
