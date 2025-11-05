import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Leader {
  id: string;
  user_id: string;
  department: string;
  email: string;
  full_name: string;
}

interface TransferMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leader: Leader | null;
  memberCount: number;
  onTransferComplete: () => void;
}

const TransferMembersDialog = ({
  open,
  onOpenChange,
  leader,
  memberCount,
  onTransferComplete,
}: TransferMembersDialogProps) => {
  const [availableLeaders, setAvailableLeaders] = useState<Leader[]>([]);
  const [selectedLeaderId, setSelectedLeaderId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingLeaders, setLoadingLeaders] = useState(true);

  useEffect(() => {
    if (open && leader) {
      loadAvailableLeaders();
    }
  }, [open, leader]);

  const loadAvailableLeaders = async () => {
    if (!leader) return;

    setLoadingLeaders(true);
    
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select(`
        id, 
        user_id, 
        department,
        profiles!inner(full_name, email)
      `)
      .eq("role", "leader")
      .eq("department", leader.department)
      .neq("user_id", leader.user_id);

    if (rolesData) {
      const leaders = rolesData.map((role: any) => ({
        id: role.id,
        user_id: role.user_id,
        department: role.department,
        email: role.profiles?.email || "",
        full_name: role.profiles?.full_name || "",
      }));

      setAvailableLeaders(leaders);
    }

    setLoadingLeaders(false);
  };

  const handleTransfer = async () => {
    if (!selectedLeaderId || !leader) return;

    setLoading(true);

    try {
      // 1. Transferir todos os membros para o novo líder
      const { error: updateError } = await supabase
        .from("members")
        .update({ leader_id: selectedLeaderId })
        .eq("leader_id", leader.user_id);

      if (updateError) throw updateError;

      // 2. Remover o líder antigo
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", leader.id);

      if (deleteError) throw deleteError;

      toast.success(`${memberCount} membro(s) transferido(s) e líder removido com sucesso`);
      onTransferComplete();
      onOpenChange(false);
      setSelectedLeaderId("");
    } catch (error) {
      console.error("Erro ao transferir membros:", error);
      toast.error("Erro ao transferir membros");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Transferir Membros</DialogTitle>
          <DialogDescription>
            Este líder possui {memberCount} membro(s) cadastrado(s). Selecione outro líder do mesmo departamento para transferir os membros antes de remover.
          </DialogDescription>
        </DialogHeader>

        {loadingLeaders ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : availableLeaders.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Não há outros líderes no mesmo departamento. Cadastre outro líder primeiro ou remova os membros manualmente.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="leader">Selecione o novo líder</Label>
              <Select value={selectedLeaderId} onValueChange={setSelectedLeaderId}>
                <SelectTrigger id="leader">
                  <SelectValue placeholder="Escolha um líder" />
                </SelectTrigger>
                <SelectContent>
                  {availableLeaders.map((l) => (
                    <SelectItem key={l.user_id} value={l.user_id}>
                      {l.full_name} ({l.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {leader && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{memberCount} membro(s)</strong> de <strong>{leader.full_name}</strong> serão transferidos para o líder selecionado.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={!selectedLeaderId || loading || availableLeaders.length === 0}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Transferir e Remover
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TransferMembersDialog;
