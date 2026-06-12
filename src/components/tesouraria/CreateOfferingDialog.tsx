import { useState, useEffect } from "react";
import { supabase, getCurrentUserCongregationId } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface Member {
  id: string;
  full_name: string;
}

interface CreateOfferingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreateOfferingDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: CreateOfferingDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [leaders, setLeaders] = useState<{ id: string; full_name: string }[]>([]);
  const [formData, setFormData] = useState({
    event_type: "",
    event_date: new Date().toISOString().split("T")[0],
    amount: "",
    notes: "",
  });
  const [selectedVerifiers, setSelectedVerifiers] = useState<string[]>([]);

  useEffect(() => {
    const loadPeople = async () => {
      const { data: membersData } = await supabase
        .from("members")
        .select("id, full_name")
        .order("full_name");

      const { data: leadersData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .order("full_name");

      if (membersData) setMembers(membersData);
      if (leadersData) setLeaders(leadersData);
    };
    loadPeople();
  }, []);

  const allPeople = [
    ...leaders.map((l) => ({ id: l.id, name: l.full_name })),
    ...members.map((m) => ({ id: m.id, name: m.full_name })),
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const congregation_id = await getCurrentUserCongregationId();
      if (!congregation_id) throw new Error("Congregação não encontrada");

      const { error } = await supabase.from("offerings").insert({
        event_type: formData.event_type,
        event_date: formData.event_date,
        amount: parseFloat(formData.amount),
        notes: formData.notes || null,
        verified_by_names: selectedVerifiers.length > 0 ? selectedVerifiers : null,
        recorded_by: user.id,
        congregation_id,
      });

      if (error) throw error;

      toast.success("Oferta registrada com sucesso!");
      setFormData({
        event_type: "",
        event_date: new Date().toISOString().split("T")[0],
        amount: "",
        notes: "",
      });
      setSelectedVerifiers([]);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Erro ao registrar oferta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[calc(100%-2rem)]">
        <DialogHeader>
          <DialogTitle>Registrar Oferta</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="event_type">Tipo de Evento *</Label>
            <Select
              value={formData.event_type}
              onValueChange={(value) =>
                setFormData({ ...formData, event_type: value })
              }
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Culto">Culto</SelectItem>
                <SelectItem value="EBD">EBD</SelectItem>
                <SelectItem value="Evento Especial">Evento Especial</SelectItem>
                <SelectItem value="Oferta de Missões">Oferta de Missões</SelectItem>
                <SelectItem value="Oferta de Construção">Oferta de Construção</SelectItem>
                <SelectItem value="Outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event_date">Data do Evento *</Label>
            <Input
              id="event_date"
              type="date"
              value={formData.event_date}
              onChange={(e) =>
                setFormData({ ...formData, event_date: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Valor Total (MZN) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Conferido por (opcional)</Label>
            <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
              {allPeople.map((person) => (
                <div key={person.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={person.id}
                    checked={selectedVerifiers.includes(person.name)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedVerifiers([...selectedVerifiers, person.name]);
                      } else {
                        setSelectedVerifiers(
                          selectedVerifiers.filter((n) => n !== person.name)
                        );
                      }
                    }}
                  />
                  <label htmlFor={person.id} className="text-sm cursor-pointer">
                    {person.name}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Observações adicionais..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                "Registrar"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
