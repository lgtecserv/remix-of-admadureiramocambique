import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import CreateMemberForm from "./CreateMemberForm";
import { Plus } from "lucide-react";

interface CreateMemberButtonProps {
  role: string | null;
  onSuccess: () => void;
}

const CreateMemberButton = ({ role, onSuccess }: CreateMemberButtonProps) => {
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
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Membro
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Membro</DialogTitle>
        </DialogHeader>
        {department && leaderId && (
          <CreateMemberForm 
            department={department} 
            leaderId={leaderId} 
            onSuccess={handleSuccess} 
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateMemberButton;
