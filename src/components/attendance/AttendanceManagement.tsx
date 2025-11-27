import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Calendar, Users } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import CreateAttendanceDialog from "./CreateAttendanceDialog";
import { toast } from "sonner";

interface Attendance {
  id: string;
  event_type: string;
  event_date: string;
  department: string;
  notes: string | null;
  members: { full_name: string } | null;
  visitors: { full_name: string } | null;
}

interface AttendanceManagementProps {
  role: string;
  department?: string;
  leaderId: string;
}

const AttendanceManagement = ({ role, department, leaderId }: AttendanceManagementProps) => {
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const loadAttendances = async () => {
    try {
      let query = supabase
        .from("attendances")
        .select(`
          *,
          members(full_name),
          visitors(full_name)
        `)
        .order("event_date", { ascending: false })
        .limit(50);

      if (role === "leader" && department) {
        query = query.eq("department", department as any);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAttendances(data || []);
    } catch (error) {
      console.error("Error loading attendances:", error);
      toast.error("Erro ao carregar presenças");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendances();

    const channel = supabase
      .channel("attendances-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendances" }, () => {
        loadAttendances();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [role, department]);

  const getEventTypeBadge = (type: string) => {
    const types: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      culto: { label: "Culto", variant: "default" },
      celula: { label: "Célula", variant: "secondary" },
      evento_especial: { label: "Evento Especial", variant: "outline" },
    };
    const config = types[type] || types.culto;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return <div className="text-center p-4">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="text-base sm:text-lg font-semibold">
            <span className="hidden sm:inline">Registro de Presenças</span>
            <span className="sm:hidden">Presenças</span>
          </h3>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} size="sm" className="w-auto shrink-0">
          <Users className="h-4 w-4 mr-1" />
          <span className="hidden xs:inline">Registrar </span>Presença
        </Button>
      </div>

      {/* Cards para Mobile */}
      <div className="block sm:hidden space-y-3">
        {attendances.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            Nenhuma presença registrada
          </Card>
        ) : (
          attendances.map((attendance) => (
            <Card key={attendance.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="space-y-1 flex-1">
                  <p className="font-medium">
                    {attendance.members?.full_name || attendance.visitors?.full_name || "-"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(attendance.event_date), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {getEventTypeBadge(attendance.event_type)}
                  <Badge variant="outline" className="text-xs">
                    {attendance.department}
                  </Badge>
                </div>
              </div>
              {attendance.notes && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {attendance.notes}
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
                <TableHead className="whitespace-nowrap">Tipo</TableHead>
                <TableHead className="whitespace-nowrap">Pessoa</TableHead>
                <TableHead className="whitespace-nowrap">Departamento</TableHead>
                <TableHead className="whitespace-nowrap">Observações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhuma presença registrada
                  </TableCell>
                </TableRow>
              ) : (
                attendances.map((attendance) => (
                  <TableRow key={attendance.id}>
                    <TableCell>
                      {format(new Date(attendance.event_date), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>{getEventTypeBadge(attendance.event_type)}</TableCell>
                    <TableCell>
                      {attendance.members?.full_name || attendance.visitors?.full_name || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{attendance.department}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {attendance.notes || "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <CreateAttendanceDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={loadAttendances}
        department={department}
        leaderId={leaderId}
        role={role}
      />
    </div>
  );
};

export default AttendanceManagement;
