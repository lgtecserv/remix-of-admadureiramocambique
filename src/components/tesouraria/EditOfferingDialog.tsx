import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { format } from "date-fns";

interface Offering {
  id: string;
  event_date: string;
  event_type: string;
  amount: number;
  notes: string | null;
  verified_by_names: string[] | null;
}

interface EditOfferingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offering: Offering;
  onSuccess: () => void;
}

export const EditOfferingDialog = ({ open, onOpenChange, offering, onSuccess }: EditOfferingDialogProps) => {
  const [eventType, setEventType] = useState(offering.event_type);
  const [amount, setAmount] = useState(offering.amount.toString());
  const [eventDate, setEventDate] = useState(format(new Date(offering.event_date), "yyyy-MM-dd"));
  const [verifiedByNames, setVerifiedByNames] = useState(offering.verified_by_names?.join(", ") || "");
  const [notes, setNotes] = useState(offering.notes || "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const verifiedByArray = verifiedByNames
      .split(",")
      .map((name) => name.trim())
      .filter((name) => name.length > 0);

    const { error } = await supabase
      .from("offerings")
      .update({
        event_type: eventType,
        amount: parseFloat(amount),
        event_date: eventDate,
        verified_by_names: verifiedByArray.length > 0 ? verifiedByArray : null,
        notes: notes.trim() || null,
      })
      .eq("id", offering.id);

    setLoading(false);

    if (error) {
      toast.error("Erro ao atualizar oferta");
      return;
    }

    toast.success("Oferta atualizada com sucesso");
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Oferta</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="event_type">Tipo de Evento</Label>
            <Input
              id="event_type"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              placeholder="Ex: Culto Dominical, Vigília, etc."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event_date">Data do Evento</Label>
              <Input
                id="event_date"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="verified_by">Conferido por (separar por vírgula)</Label>
            <Input
              id="verified_by"
              value={verifiedByNames}
              onChange={(e) => setVerifiedByNames(e.target.value)}
              placeholder="Ex: João Silva, Maria Santos"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações adicionais (opcional)"
            />
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
