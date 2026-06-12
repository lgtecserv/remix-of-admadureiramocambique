import { useEffect, useState } from "react";
import { supabase, getDepartmentLabel, getCurrentUserCongregationId } from "@/lib/supabase";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, CheckCircle, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DateRange } from "@/components/common/DateRangeFilter";

interface Visitor {
  id: string;
  full_name: string;
  phone_number: string;
  visit_date: string;
  invited_by: string;
  observations: string;
  returned: boolean;
  department: string;
  leader_id: string;
  created_at: string;
}

interface VisitorManagementProps {
  userRole?: string;
  userDepartment?: string;
  userId?: string;
  dateRange?: DateRange | null;
}

const VisitorManagement = ({ userRole, userDepartment, userId, dateRange }: VisitorManagementProps) => {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);

  const loadVisitors = async () => {
    let query = supabase.from("visitors").select("*").order("visit_date", { ascending: false });

    if (userRole === "leader" && userDepartment) {
      query = query.eq("department", userDepartment as any);
    }

    if (dateRange) {
      query = query
        .gte("visit_date", format(dateRange.from, "yyyy-MM-dd"))
        .lte("visit_date", format(dateRange.to, "yyyy-MM-dd"));
    }

    const { data, error } = await query;

    if (error) {
      toast.error("Erro ao carregar visitantes");
      console.error(error);
    } else {
      setVisitors(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadVisitors();

    const channel = supabase
      .channel("visitors-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "visitors" },
        () => {
          loadVisitors();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userRole, userDepartment, dateRange]);

  const handleMarkReturned = async (visitorId: string) => {
    const { error } = await supabase
      .from("visitors")
      .update({ returned: true })
      .eq("id", visitorId);

    if (error) {
      toast.error("Erro ao marcar retorno");
    } else {
      toast.success("Visitante marcado como retornou!");
      loadVisitors();
    }
  };

  const handleConvertToMember = async (visitor: Visitor) => {
    const congregation_id = await getCurrentUserCongregationId();
    if (!congregation_id) {
      toast.error("Congregação não encontrada");
      return;
    }
    const { error } = await supabase.from("members").insert({
      full_name: visitor.full_name,
      phone_number: visitor.phone_number,
      department: visitor.department as any,
      leader_id: visitor.leader_id,
      status: "novo",
      congregation_id,
    });

    if (error) {
      toast.error("Erro ao converter visitante em membro");
      console.error(error);
    } else {
      await handleMarkReturned(visitor.id);
      toast.success("Visitante convertido em membro com sucesso!");
    }
  };

  const handleDelete = async (visitorId: string) => {
    const { error } = await supabase.from("visitors").delete().eq("id", visitorId);

    if (error) {
      toast.error("Erro ao remover visitante");
    } else {
      toast.success("Visitante removido com sucesso");
      loadVisitors();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (visitors.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum visitante cadastrado ainda.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <div className="inline-block min-w-full align-middle">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Data da Visita</TableHead>
                <TableHead className="hidden sm:table-cell">Convidado por</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
        <TableBody>
          {visitors.map((visitor) => (
            <TableRow key={visitor.id}>
              <TableCell className="font-medium">{visitor.full_name}</TableCell>
              <TableCell>{visitor.phone_number}</TableCell>
              <TableCell>
                {format(new Date(visitor.visit_date), "dd/MM/yyyy", { locale: ptBR })}
              </TableCell>
              <TableCell className="hidden sm:table-cell">{visitor.invited_by || "-"}</TableCell>
              <TableCell>{getDepartmentLabel(visitor.department)}</TableCell>
              <TableCell>
                {visitor.returned ? (
                  <Badge variant="default">Retornou</Badge>
                ) : (
                  <Badge variant="secondary">Primeira visita</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {!visitor.returned && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkReturned(visitor.id)}
                        title="Marcar como retornou"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" title="Converter em membro">
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Converter em membro</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja converter {visitor.full_name} em membro?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleConvertToMember(visitor)}>
                              Converter
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                  {(userRole === "pastor" || visitor.leader_id === userId) && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja remover este visitante? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(visitor.id)}>
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
        </div>
      </div>
    </div>
  );
};

export default VisitorManagement;
