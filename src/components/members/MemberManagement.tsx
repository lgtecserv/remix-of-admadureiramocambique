import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Pencil, Trash2 } from "lucide-react";
import EditMemberForm from "./EditMemberForm";
import { toast } from "sonner";
import { getDepartmentLabel, getStatusLabel } from "@/lib/supabase";
import { useSelectedCongregation } from "@/contexts/SelectedCongregationContext";
import { MemberListSkeleton, MemberTableSkeleton } from "@/components/ui/content-skeleton";
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

interface Member {
  id: string;
  full_name: string;
  phone_number: string;
  department: string;
  status: string;
  created_at: string;
  leader_id: string;
}

interface MemberManagementProps {
  searchTerm?: string;
  statusFilter?: string;
  departmentFilter?: string;
}

const MemberManagement = ({ 
  searchTerm = "", 
  statusFilter = "all", 
  departmentFilter = "all" 
}: MemberManagementProps) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const { getEffectiveCongregationId } = useSelectedCongregation();
  const congId = getEffectiveCongregationId();

  const loadMembers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setCurrentUserId(user.id);

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role, department")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!roleData) return;

    setUserRole(roleData.role);

    let query = supabase
      .from("members")
      .select("*")
      .order("created_at", { ascending: false });

    // Apply congregation filter from context
    if (congId) {
      query = query.eq("congregation_id", congId);
    }

    if (roleData.role === "leader" && roleData.department) {
      query = query.eq("department", roleData.department);
    }

    const { data } = await query;

    if (data) {
      setMembers(data);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadMembers();

    const channel = supabase
      .channel("member-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "members" },
        () => {
          setTimeout(loadMembers, 0);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [congId]);

  useEffect(() => {
    let filtered = [...members];

    if (searchTerm) {
      filtered = filtered.filter(member =>
        member.full_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(member => member.status === statusFilter);
    }

    if (departmentFilter !== "all") {
      filtered = filtered.filter(member => member.department === departmentFilter);
    }

    setFilteredMembers(filtered);
  }, [members, searchTerm, statusFilter, departmentFilter]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("members").delete().eq("id", id);

    if (error) {
      toast.error("Erro ao remover membro");
      return;
    }

    toast.success("Membro removido com sucesso");
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "novo":
        return "default";
      case "ativo":
        return "secondary";
      case "inativo":
        return "outline";
      default:
        return "default";
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="block sm:hidden">
          <MemberListSkeleton />
        </div>
        <div className="hidden sm:block">
          <MemberTableSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cards para Mobile */}
      <div className="block sm:hidden space-y-3">
        {filteredMembers.length === 0 ? (
          <Card className="p-6">
            <p className="text-center text-muted-foreground text-sm">
              {members.length === 0 
                ? "Nenhum membro cadastrado ainda." 
                : "Nenhum membro encontrado com os filtros aplicados."}
            </p>
          </Card>
        ) : (
          filteredMembers.map((member, index) => (
            <Card 
              key={member.id} 
              className="p-4 animate-fade-in card-hover"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-sm">{member.full_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{member.phone_number}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {getDepartmentLabel(member.department)}
                    </Badge>
                    <Badge variant={getStatusBadgeVariant(member.status)} className="text-xs">
                      {getStatusLabel(member.status)}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {(userRole === "pastor" || userRole === "secretary" || member.leader_id === currentUserId) ? (
                    <>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditingMember(member);
                          setEditDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>

                      {userRole === "secretary" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon" className="h-8 w-8">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja remover este membro? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(member.id)}>
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </>
                  ) : null}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Tabela para Desktop */}
      <div className="hidden sm:block overflow-x-auto">
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Nome</TableHead>
                <TableHead className="whitespace-nowrap">Telefone</TableHead>
                <TableHead className="whitespace-nowrap">Departamento</TableHead>
                <TableHead className="whitespace-nowrap">Status</TableHead>
                <TableHead className="hidden md:table-cell whitespace-nowrap">Data de Cadastro</TableHead>
                <TableHead className="text-right whitespace-nowrap">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {members.length === 0 
                      ? "Nenhum membro cadastrado ainda." 
                      : "Nenhum membro encontrado com os filtros aplicados."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredMembers.map((member, index) => (
                  <TableRow 
                    key={member.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <TableCell className="font-medium">{member.full_name}</TableCell>
                    <TableCell>{member.phone_number}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getDepartmentLabel(member.department)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(member.status)}>
                        {getStatusLabel(member.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{new Date(member.created_at).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="text-right space-x-2">
                      {(userRole === "pastor" || userRole === "secretary" || member.leader_id === currentUserId) ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingMember(member);
                              setEditDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          {userRole === "secretary" && (
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
                                    Tem certeza que deseja remover este membro? Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(member.id)}>
                                    Remover
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)] mx-auto">
          <DialogHeader>
            <DialogTitle>Editar Membro</DialogTitle>
          </DialogHeader>
          {editingMember && (
            <EditMemberForm
              member={editingMember}
              onSuccess={() => {
                setEditDialogOpen(false);
                setEditingMember(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MemberManagement;
