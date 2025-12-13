import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface CreateFollowupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  department?: string;
  leaderId: string;
  role: string;
}

const CreateFollowupDialog = ({
  open,
  onOpenChange,
  onSuccess,
  department,
  leaderId,
  role,
}: CreateFollowupDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [visitorId, setVisitorId] = useState("");
  const [followupType, setFollowupType] = useState("whatsapp");
  const [status, setStatus] = useState("pendente");
  const [followupDate, setFollowupDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState("");
  const [visitors, setVisitors] = useState<{ id: string; full_name: string; department: string }[]>([]);

  useEffect(() => {
    if (open) {
      loadVisitors();
    }
  }, [open, department]);

  const loadVisitors = async () => {
    try {
      let query = supabase.from("visitors").select("id, full_name, department");

      if (role === "leader" && department) {
        query = query.eq("department", department as any);
      }

      const { data, error } = await query;
      if (error) throw error;
      setVisitors(data || []);
    } catch (error) {
      console.error("Error loading visitors:", error);
      toast.error("Erro ao carregar visitantes");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const selectedVisitor = visitors.find(v => v.id === visitorId);
      
      const followupData = {
        visitor_id: visitorId,
        followup_type: followupType,
        status,
        followup_date: format(followupDate, "yyyy-MM-dd"),
        department: selectedVisitor?.department || department,
        leader_id: leaderId,
        notes: notes || null,
      };

      const { error } = await supabase.from("visitor_followups").insert(followupData as any);

      if (error) throw error;

      toast.success("Acompanhamento registrado com sucesso!");
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error("Error creating followup:", error);
      toast.error(error.message || "Erro ao registrar acompanhamento");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setVisitorId("");
    setFollowupType("whatsapp");
    setStatus("pendente");
    setFollowupDate(new Date());
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[calc(100%-2rem)]">
        <DialogHeader>
          <DialogTitle>Novo Acompanhamento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Visitante *</Label>
            <Select value={visitorId} onValueChange={setVisitorId} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {visitors.map((visitor) => (
                  <SelectItem key={visitor.id} value={visitor.id}>
                    {visitor.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tipo de Contato *</Label>
            <Select value={followupType} onValueChange={setFollowupType} required>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ligacao">Ligação</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="visita">Visita</SelectItem>
                <SelectItem value="email">E-mail</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status *</Label>
            <Select value={status} onValueChange={setStatus} required>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="realizado">Realizado</SelectItem>
                <SelectItem value="sem_sucesso">Sem Sucesso</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Data *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !followupDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {followupDate ? format(followupDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={followupDate} onSelect={(date) => date && setFollowupDate(date)} locale={ptBR} />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Detalhes do contato..." rows={3} />
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Salvando..." : "Registrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateFollowupDialog;
