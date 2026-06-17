import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import CreateMemberForm from "./CreateMemberForm";
import { Plus } from "lucide-react";

interface CreateMemberButtonProps {
  role: string | null;
  onSuccess: () => void;
  defaultType?: "membro" | "congregado";
}

const CreateMemberButton = ({ role, onSuccess, defaultType = "membro" }: CreateMemberButtonProps) => {
  const [open, setOpen] = useState(false);
  const [department, setDepartment] = useState<string>("");
  const [leaderId, setLeaderId] = useState<string>("");

  useEffect(() => {
    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setLeaderId(user.id);

      if (role === "leader") {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("department")
          .eq("user_id", user.id)
          .single();

        if (roleData?.department) {
          setDepartment(roleData.department);
        }
      }
    };

    if (open) {
      loadUserData();
    }
  }, [open, role]);

  const handleSuccess = () => {
    setOpen(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="w-auto shrink-0">
          <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
          <span className="hidden xs:inline">Novo </span>{defaultType === "congregado" ? "Congregado" : "Membro"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md w-[calc(100%-2rem)] mx-auto">
        <DialogHeader>
          <DialogTitle>Cadastrar Novo {defaultType === "congregado" ? "Congregado" : "Membro"}</DialogTitle>
        </DialogHeader>
        {leaderId && (role === "secretary" || department) && (
          <CreateMemberForm 
            department={department || undefined} 
            leaderId={leaderId} 
            onSuccess={handleSuccess} 
            defaultType={defaultType}
            role={role}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateMemberButton;
