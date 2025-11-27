import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Phone, Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import CreateFollowupDialog from "./CreateFollowupDialog";
import { toast } from "sonner";

interface Followup {
  id: string;
  followup_date: string;
  followup_type: string;
  status: string;
  notes: string | null;
  visitors: { full_name: string; phone_number: string };
}

interface FollowupManagementProps {
  role: string;
  department?: string;
  leaderId: string;
}

const FollowupManagement = ({ role, department, leaderId }: FollowupManagementProps) => {
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const loadFollowups = async () => {
    try {
      let query = supabase
        .from("visitor_followups")
        .select(`
          *,
          visitors(full_name, phone_number)
        `)
        .order("followup_date", { ascending: false });

      if (role === "leader" && department) {
        query = query.eq("department", department as any);
      }

      const { data, error } = await query;

      if (error) throw error;
      setFollowups(data || []);
    } catch (error) {
      console.error("Error loading followups:", error);
      toast.error("Erro ao carregar acompanhamentos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFollowups();

    const channel = supabase
      .channel("followups-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "visitor_followups" }, () => {
        loadFollowups();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [role, department]);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
      pendente: { label: "Pendente", variant: "secondary" },
      realizado: { label: "Realizado", variant: "default" },
      sem_sucesso: { label: "Sem Sucesso", variant: "destructive" },
    };
    const config = statusConfig[status] || statusConfig.pendente;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const typeLabels: Record<string, string> = {
      ligacao: "Ligação",
      whatsapp: "WhatsApp",
      visita: "Visita",
      email: "E-mail",
    };
    return <Badge variant="outline">{typeLabels[type] || type}</Badge>;
  };

  if (loading) {
    return <div className="text-center p-4">Carregando...</div>;
  }

  return (
    <div className="space-y-4 overflow-x-hidden">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Phone className="h-5 w-5 text-primary shrink-0" />
          <h3 className="text-base sm:text-lg font-semibold truncate">
            <span className="hidden sm:inline">Acompanhamento de Visitantes</span>
            <span className="sm:hidden">Acompanhamentos</span>
          </h3>
        </div>
        <Button 
          onClick={() => setIsDialogOpen(true)} 
          size="sm" 
          className="shrink-0 h-8 px-2 sm:px-3 text-xs"
        >
          <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline ml-1">Acompanhamento</span>
        </Button>
      </div>

      {/* Cards para Mobile */}
      <div className="block sm:hidden space-y-3 overflow-x-hidden">
        {followups.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            Nenhum acompanhamento registrado
          </Card>
        ) : (
          followups.map((followup) => (
            <Card key={followup.id} className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="space-y-1 flex-1 min-w-0">
                  <p className="font-medium truncate">{followup.visitors.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(followup.followup_date), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {getTypeBadge(followup.followup_type)}
                  {getStatusBadge(followup.status)}
                </div>
              </div>
              {followup.notes && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2 break-words">
                  {followup.notes}
                </p>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Tabela para Desktop */}
      <div className="hidden sm:block">
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Data</TableHead>
                <TableHead className="whitespace-nowrap">Visitante</TableHead>
                <TableHead className="whitespace-nowrap">Tipo</TableHead>
                <TableHead className="whitespace-nowrap">Status</TableHead>
                <TableHead className="whitespace-nowrap">Observações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {followups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum acompanhamento registrado
                  </TableCell>
                </TableRow>
              ) : (
                followups.map((followup) => (
                  <TableRow key={followup.id}>
                    <TableCell>
                      {format(new Date(followup.followup_date), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>{followup.visitors.full_name}</TableCell>
                    <TableCell>{getTypeBadge(followup.followup_type)}</TableCell>
                    <TableCell>{getStatusBadge(followup.status)}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {followup.notes || "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <CreateFollowupDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={loadFollowups}
        department={department}
        leaderId={leaderId}
        role={role}
      />
    </div>
  );
};

export default FollowupManagement;
