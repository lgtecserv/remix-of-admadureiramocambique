import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Check, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CreateRequestDialog } from "./CreateRequestDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Request {
  id: string;
  asset_id: string;
  quantity: number;
  purpose: string;
  status: string;
  image_url: string | null;
  approval_comment: string | null;
  created_at: string;
  church_assets: {
    name: string;
  };
}

export const RequestManagement = () => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject">("approve");
  const [comment, setComment] = useState("");

  const loadRequests = async () => {
    const { data, error } = await supabase
      .from("asset_requests")
      .select("*, church_assets(name)")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar solicitações");
      return;
    }

    setRequests(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadRequests();

    const channel = supabase
      .channel("requests-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "asset_requests" },
        () => loadRequests()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleUpdateStatus = async (id: string, status: string, comment?: string) => {
    const { error } = await supabase
      .from("asset_requests")
      .update({ 
        status,
        approval_comment: comment || null
      })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar status");
      return;
    }

    toast.success(`Solicitação ${status === "aprovado" ? "aprovada" : "rejeitada"}`);
    setCommentDialogOpen(false);
    setComment("");
  };

  const openCommentDialog = (request: Request, type: "approve" | "reject") => {
    setSelectedRequest(request);
    setActionType(type);
    setCommentDialogOpen(true);
  };

  const filteredRequests = requests.filter((request) => {
    if (filter === "all") return true;
    return request.status === filter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pendente":
        return <Badge variant="outline">Pendente</Badge>;
      case "aprovado":
        return <Badge className="bg-green-500">Aprovado</Badge>;
      case "rejeitado":
        return <Badge variant="destructive">Rejeitado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando solicitações...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
          >
            Todas ({requests.length})
          </Button>
          <Button
            variant={filter === "pendente" ? "default" : "outline"}
            onClick={() => setFilter("pendente")}
          >
            Pendentes ({requests.filter((r) => r.status === "pendente").length})
          </Button>
          <Button
            variant={filter === "aprovado" ? "default" : "outline"}
            onClick={() => setFilter("aprovado")}
          >
            Aprovadas ({requests.filter((r) => r.status === "aprovado").length})
          </Button>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Solicitação
        </Button>
      </div>

      <div className="space-y-3">
        {filteredRequests.map((request) => (
          <Card key={request.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {request.church_assets.name}
                </CardTitle>
                {getStatusBadge(request.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Quantidade</p>
                  <p className="font-medium">{request.quantity}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Data</p>
                  <p className="font-medium">
                    {format(new Date(request.created_at), "dd/MM/yyyy", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
              </div>
              {request.image_url && (
                <img
                  src={request.image_url}
                  alt="Solicitação"
                  className="w-full h-40 object-cover rounded-md"
                />
              )}
              <div>
                <p className="text-sm text-muted-foreground mb-1">Finalidade:</p>
                <p className="text-sm">{request.purpose}</p>
              </div>
              {request.approval_comment && (
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-sm font-medium mb-1">Comentário:</p>
                  <p className="text-sm text-muted-foreground">{request.approval_comment}</p>
                </div>
              )}
              {request.status === "pendente" && (
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openCommentDialog(request, "approve")}
                    className="flex-1"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => openCommentDialog(request, "reject")}
                    className="flex-1"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Rejeitar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRequests.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Nenhuma solicitação encontrada
        </div>
      )}

      <CreateRequestDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          setCreateDialogOpen(false);
          loadRequests();
        }}
      />

      <Dialog open={commentDialogOpen} onOpenChange={setCommentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Aprovar" : "Rejeitar"} Solicitação
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="comment">Comentário (opcional)</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Adicione um comentário sobre esta decisão"
                rows={4}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCommentDialogOpen(false);
                  setComment("");
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={() =>
                  selectedRequest &&
                  handleUpdateStatus(
                    selectedRequest.id,
                    actionType === "approve" ? "aprovado" : "rejeitado",
                    comment.trim() || undefined
                  )
                }
                className="flex-1"
              >
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
