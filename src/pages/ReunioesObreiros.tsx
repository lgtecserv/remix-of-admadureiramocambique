import { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useSelectedCongregation } from "@/contexts/SelectedCongregationContext";
import { MeetingAttendanceDialog } from "@/components/meetings/MeetingAttendanceDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Meeting {
  id: string;
  date: string;
  theme: string;
  congregation_id: string;
  total_presentes?: number;
  total_ausentes?: number;
  total_justificados?: number;
}

export default function ReunioesObreiros() {
  const { selectedCongregationId } = useSelectedCongregation();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ full_name: string } | null>(null);
  const [user, setUser] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [meetingToDelete, setMeetingToDelete] = useState<Meeting | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        const [roleResult, profileResult] = await Promise.all([
          supabase.from("user_roles").select("role").eq("user_id", session.user.id).single(),
          supabase.from("profiles").select("full_name").eq("id", session.user.id).single(),
        ]);
        if (roleResult.data) setRole(roleResult.data.role);
        if (profileResult.data) setProfile(profileResult.data);
      }
    };
    checkAuth();
    loadMeetings();
  }, [selectedCongregationId]);

  const loadMeetings = async () => {
    setLoading(true);
    try {
      let query = supabase.from("worker_meetings").select("*").order("date", { ascending: false });
      
      if (selectedCongregationId !== "all") {
        query = query.or(`congregation_id.eq.${selectedCongregationId},congregation_id.is.null`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch attendance stats for each meeting
      const meetingsWithStats = await Promise.all(
        (data || []).map(async (meeting) => {
          const { data: attData } = await supabase
            .from("meeting_attendance")
            .select("status")
            .eq("meeting_id", meeting.id);
            
          let presentes = 0, ausentes = 0, justificados = 0;
          attData?.forEach(att => {
            if (att.status === "presente") presentes++;
            if (att.status === "ausente") ausentes++;
            if (att.status === "justificado") justificados++;
          });
          
          return {
            ...meeting,
            total_presentes: presentes,
            total_ausentes: ausentes,
            total_justificados: justificados
          };
        })
      );
      
      setMeetings(meetingsWithStats);
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao carregar reuniões.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!meetingToDelete) return;
    try {
      const { error } = await supabase.from("worker_meetings").delete().eq("id", meetingToDelete.id);
      if (error) throw error;
      toast.success("Reunião excluída com sucesso.");
      loadMeetings();
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao excluir reunião.");
    } finally {
      setMeetingToDelete(null);
    }
  };

  return (
    <AppLayout userName={profile?.full_name} role={role || undefined} user={user}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#1A365D]">Reuniões de Obreiros</h1>
            <p className="text-muted-foreground mt-1">
              Controle de chamadas e presenças nas reuniões.
            </p>
          </div>
          <Button 
            className="bg-[#1A365D] hover:bg-[#1A365D]/90 w-full sm:w-auto" 
            onClick={() => {
              setEditingMeeting(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Reunião
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow border p-6">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Carregando...</p>
          ) : meetings.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center">
              <Calendar className="w-12 h-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900">Nenhuma reunião registrada</h3>
              <p className="text-slate-500 mt-1 max-w-sm">
                As reuniões de obreiros aparecerão aqui. Clique no botão acima para criar a primeira.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {meetings.map((meeting) => (
                <div key={meeting.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="bg-primary/10 text-primary p-3 rounded-lg flex flex-col items-center justify-center min-w-[70px]">
                      <span className="text-xs font-semibold uppercase">{format(new Date(meeting.date + "T00:00:00"), "MMM", { locale: ptBR })}</span>
                      <span className="text-xl font-bold leading-none mt-1">{format(new Date(meeting.date + "T00:00:00"), "dd")}</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg text-slate-900">{meeting.theme}</h4>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-slate-500">
                        <span className="text-green-600 font-medium">{meeting.total_presentes || 0} Presentes</span>
                        <span className="text-red-500 font-medium">{meeting.total_ausentes || 0} Faltas</span>
                        <span className="text-amber-500 font-medium">{meeting.total_justificados || 0} Justificados</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() => {
                        setEditingMeeting(meeting);
                        setDialogOpen(true);
                      }}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Editar/Chamada
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 w-full sm:w-auto justify-center"
                      onClick={() => setMeetingToDelete(meeting)}
                    >
                      <Trash2 className="w-4 h-4 sm:mr-0 mr-2" />
                      <span className="sm:hidden">Excluir</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <MeetingAttendanceDialog 
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        meetingToEdit={editingMeeting}
        onSuccess={loadMeetings}
      />

      <AlertDialog open={!!meetingToDelete} onOpenChange={() => setMeetingToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir reunião?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta reunião e todos os registros de presença vinculados a ela?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
