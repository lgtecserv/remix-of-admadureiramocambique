import { useEffect, useState } from "react";
import { supabase, getDepartmentLabel } from "@/lib/supabase";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import TransferMembersDialog from "./TransferMembersDialog";
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

interface Leader {
  id: string;
  user_id: string;
  department: string;
  email: string;
  full_name: string;
}

const LeaderManagement = () => {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [loading, setLoading] = useState(true);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [leaderToDelete, setLeaderToDelete] = useState<Leader & { memberCount: number } | null>(null);

  const loadLeaders = async () => {
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select(`
        id, 
        user_id, 
        department,
        profiles!inner(full_name, email)
      `)
      .eq("role", "leader");

    if (rolesData) {
      const leadersWithDetails = rolesData.map((role: any) => ({
        id: role.id,
        user_id: role.user_id,
        department: role.department,
        email: role.profiles?.email || "",
        full_name: role.profiles?.full_name || "",
      }));

      setLeaders(leadersWithDetails);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadLeaders();
  }, []);

  const handleDelete = async (leader: Leader) => {
    // Verificar se o líder tem membros cadastrados
    const { count } = await supabase
      .from("members")
      .select("*", { count: "exact", head: true })
      .eq("leader_id", leader.user_id);

    // Se tem membros, abrir dialog de transferência
    if (count && count > 0) {
      setLeaderToDelete({ ...leader, memberCount: count });
      setTransferDialogOpen(true);
      return;
    }

    // Se não tem membros, deletar diretamente
    const { error: roleError } = await supabase
      .from("user_roles")
      .delete()
      .eq("id", leader.id);

    if (roleError) {
      toast.error("Erro ao remover líder");
      return;
    }

    toast.success("Líder removido com sucesso");
    loadLeaders();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (leaders.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum líder cadastrado ainda.
      </div>
    );
  }

  return (
    <>
      <TransferMembersDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        leader={leaderToDelete}
        memberCount={leaderToDelete?.memberCount || 0}
        onTransferComplete={() => {
          setLeaderToDelete(null);
          loadLeaders();
        }}
      />

      <div className="rounded-md border">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Departamento</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leaders.map((leader) => (
            <TableRow key={leader.id}>
              <TableCell className="font-medium">{leader.full_name}</TableCell>
              <TableCell>{leader.email}</TableCell>
              <TableCell>{getDepartmentLabel(leader.department)}</TableCell>
              <TableCell className="text-right">
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
                        Tem certeza que deseja remover este líder? Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(leader)}>
                              Remover
                            </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
    </>
  );
};

export default LeaderManagement;
