import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useSelectedCongregation } from "@/contexts/SelectedCongregationContext";
import { CheckCircle2, XCircle, AlertCircle, Save, Loader2 } from "lucide-react";

interface Member {
  id: string;
  full_name: string;
  member_type: string;
  church_office: string | null;
  church_function: string | null;
}

interface Meeting {
  id?: string;
  date: string;
  theme: string;
  congregation_id: string;
}

interface AttendanceRecord {
  member_id: string;
  status: "presente" | "ausente" | "justificado";
}

interface MeetingAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingToEdit?: Meeting | null;
  onSuccess: () => void;
}

export const MeetingAttendanceDialog = ({
  open,
  onOpenChange,
  meetingToEdit,
  onSuccess
}: MeetingAttendanceDialogProps) => {
  const { selectedCongregationId } = useSelectedCongregation();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [theme, setTheme] = useState("");
  const [workers, setWorkers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<Record<string, "presente" | "ausente" | "justificado">>({});

  useEffect(() => {
    if (open) {
      if (meetingToEdit) {
        setDate(meetingToEdit.date);
        setTheme(meetingToEdit.theme);
      } else {
        setDate(new Date().toISOString().split("T")[0]);
        setTheme("");
      }
      loadData();
    } else {
      setWorkers([]);
      setAttendance({});
    }
  }, [open, meetingToEdit, selectedCongregationId]);

  const loadData = async () => {
    setFetching(true);
    try {
      // 1. Fetch ALL members for the congregation
      let query = supabase.from("members").select("id, full_name, member_type, church_office, church_function").in("status", ["ativo", "novo"]);
      
      const isEditingGlobal = meetingToEdit && !meetingToEdit.congregation_id;
      const isCreatingGlobal = !meetingToEdit && selectedCongregationId === "all";
      
      if (!isEditingGlobal && !isCreatingGlobal) {
        // If it's a specific meeting, use its congregation. If creating new, use selected.
        const targetCongregationId = meetingToEdit ? meetingToEdit.congregation_id : selectedCongregationId;
        if (targetCongregationId && targetCongregationId !== "all") {
          query = query.eq("congregation_id", targetCongregationId);
        }
      }

      const { data: membersData, error: membersError } = await query;
      
      if (membersError) throw membersError;

      // 2. Filter rules: church_office != null OR church_function != null OR legacy obreiro
      const filteredWorkers = (membersData || []).filter(m => {
        return (m.church_office && m.church_office.trim() !== "") || 
               (m.church_function && m.church_function.trim() !== "") ||
               m.member_type === "obreiro";
      }).sort((a, b) => a.full_name.localeCompare(b.full_name));

      setWorkers(filteredWorkers);

      // 3. If editing, fetch existing attendance
      const initialAttendance: Record<string, "presente" | "ausente" | "justificado"> = {};
      
      if (meetingToEdit?.id) {
        const { data: attData, error: attError } = await supabase
          .from("meeting_attendance")
          .select("member_id, status")
          .eq("meeting_id", meetingToEdit.id);
          
        if (attError) throw attError;
        
        attData?.forEach(record => {
          initialAttendance[record.member_id] = record.status as any;
        });
      } else {
        // Default everyone to 'presente' for new meetings to make it easier
        filteredWorkers.forEach(w => {
          initialAttendance[w.id] = "presente";
        });
      }
      
      setAttendance(initialAttendance);
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao carregar dados: " + err.message);
    } finally {
      setFetching(false);
    }
  };

  const handleStatusChange = (memberId: string, status: "presente" | "ausente" | "justificado") => {
    setAttendance(prev => ({
      ...prev,
      [memberId]: status
    }));
  };

  const handleSave = async () => {
    if (!date) return toast.error("Preencha a data da reunião");
    if (!theme) return toast.error("Preencha o tema da reunião");

    setLoading(true);
    try {
      let meetingId = meetingToEdit?.id;

      // 1. Insert or update meeting
      if (meetingId) {
        const { error } = await supabase
          .from("worker_meetings")
          .update({ date, theme })
          .eq("id", meetingId);
        if (error) throw error;
      } else {
        const { data: newMeeting, error } = await supabase
          .from("worker_meetings")
          .insert({
            date,
            theme,
            congregation_id: selectedCongregationId === "all" ? null : selectedCongregationId
          })
          .select()
          .single();
          
        if (error) throw error;
        meetingId = newMeeting.id;
      }

      // 2. Prepare attendance records
      const attendanceRecords = Object.entries(attendance).map(([member_id, status]) => ({
        meeting_id: meetingId,
        member_id,
        status
      }));

      // 3. Upsert attendance
      // First delete existing for this meeting
      if (meetingToEdit?.id) {
        await supabase.from("meeting_attendance").delete().eq("meeting_id", meetingId);
      }
      
      // Then insert new ones
      if (attendanceRecords.length > 0) {
        const { error: attError } = await supabase
          .from("meeting_attendance")
          .insert(attendanceRecords);
          
        if (attError) throw attError;
      }

      toast.success(meetingToEdit ? "Reunião atualizada com sucesso!" : "Reunião salva com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao salvar reunião: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{meetingToEdit ? "Editar Reunião" : "Nova Reunião Global de Obreiros"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 my-4">
          <div className="space-y-2">
            <Label>Data da Reunião</Label>
            <Input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)} 
              disabled={fetching || loading}
            />
          </div>
          <div className="space-y-2">
            <Label>Tema / Assunto Principal</Label>
            <Input 
              placeholder="Ex: Alinhamento para o próximo mês" 
              value={theme}
              onChange={e => setTheme(e.target.value)}
              disabled={fetching || loading}
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto border rounded-md">
          {fetching ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : workers.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
              <p>Nenhum obreiro encontrado nesta congregação.</p>
              <p className="text-sm">Certifique-se de que os membros tenham o Tipo 'Obreiro' ou um Cargo/Função.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                <TableRow>
                  <TableHead>Obreiro(a)</TableHead>
                  <TableHead>Cargo / Função</TableHead>
                  <TableHead className="text-center w-[300px]">Presença</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workers.map(worker => {
                  const status = attendance[worker.id] || "ausente";
                  return (
                    <TableRow key={worker.id}>
                      <TableCell className="font-medium">{worker.full_name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          {worker.church_office && <span className="text-sm">{worker.church_office}</span>}
                          {worker.church_function && <span className="text-xs text-muted-foreground">{worker.church_function}</span>}
                          {!worker.church_office && !worker.church_function && <span className="text-xs text-red-500 font-medium">⚠️ Sem cargo/função definido</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            type="button"
                            variant={status === "presente" ? "default" : "outline"}
                            className={status === "presente" ? "bg-green-600 hover:bg-green-700" : ""}
                            onClick={() => handleStatusChange(worker.id, "presente")}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Presente
                          </Button>
                          <Button
                            size="sm"
                            type="button"
                            variant={status === "ausente" ? "destructive" : "outline"}
                            onClick={() => handleStatusChange(worker.id, "ausente")}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Faltou
                          </Button>
                          <Button
                            size="sm"
                            type="button"
                            variant={status === "justificado" ? "secondary" : "outline"}
                            className={status === "justificado" ? "bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-300" : ""}
                            onClick={() => handleStatusChange(worker.id, "justificado")}
                          >
                            <AlertCircle className="w-4 h-4 mr-1" />
                            Justificou
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading || fetching}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar Chamada
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
