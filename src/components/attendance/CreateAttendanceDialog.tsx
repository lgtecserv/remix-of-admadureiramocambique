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

interface CreateAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  department?: string;
  leaderId: string;
  role: string;
}

const CreateAttendanceDialog = ({
  open,
  onOpenChange,
  onSuccess,
  department,
  leaderId,
  role,
}: CreateAttendanceDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [personType, setPersonType] = useState<"membro" | "congregado">("membro");
  const [selectedPerson, setSelectedPerson] = useState("");
  const [eventType, setEventType] = useState("culto");
  const [eventDate, setEventDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState("");
  const [people, setPeople] = useState<{ id: string; full_name: string; department: string }[]>([]);

  useEffect(() => {
    if (open) {
      loadPeople();
    }
  }, [open, personType, department]);

  const loadPeople = async () => {
    try {
      let query = supabase.from("members").select("id, full_name, department").eq("member_type", personType);

      if (role === "leader" && department) {
        query = query.eq("department", department as any);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPeople(data || []);
    } catch (error) {
      console.error("Error loading people:", error);
      toast.error("Erro ao carregar lista");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const selectedPersonData = people.find(p => p.id === selectedPerson);
      
      const attendanceData: any = {
        event_type: eventType,
        event_date: format(eventDate, "yyyy-MM-dd"),
        department: selectedPersonData?.department || department,
        leader_id: leaderId,
        notes: notes || null,
      };

      attendanceData.member_id = selectedPerson;

      const { error } = await supabase.from("attendances").insert(attendanceData as any);

      if (error) throw error;

      toast.success("Presença registrada com sucesso!");
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error("Error creating attendance:", error);
      toast.error(error.message || "Erro ao registrar presença");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPersonType("membro");
    setSelectedPerson("");
    setEventType("culto");
    setEventDate(new Date());
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[calc(100%-2rem)]">
        <DialogHeader>
          <DialogTitle>Registrar Presença</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Pessoa</Label>
            <Select value={personType} onValueChange={(value: any) => { setPersonType(value); setSelectedPerson(""); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="membro">Membro</SelectItem>
                <SelectItem value="congregado">Congregado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Pessoa *</Label>
            <Select value={selectedPerson} onValueChange={setSelectedPerson} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {people.map((person) => (
                  <SelectItem key={person.id} value={person.id}>
                    {person.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tipo de Evento *</Label>
            <Select value={eventType} onValueChange={setEventType} required>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="culto">Culto</SelectItem>
                <SelectItem value="celula">Célula</SelectItem>
                <SelectItem value="evento_especial">Evento Especial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Data do Evento *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !eventDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {eventDate ? format(eventDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={eventDate} onSelect={(date) => date && setEventDate(date)} locale={ptBR} />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observações adicionais..." />
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

export default CreateAttendanceDialog;
