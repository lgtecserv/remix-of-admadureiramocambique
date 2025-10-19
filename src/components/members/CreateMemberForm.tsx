import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface CreateMemberFormProps {
  department: string;
  leaderId: string;
  onSuccess: () => void;
}

const CreateMemberForm = ({ department, leaderId, onSuccess }: CreateMemberFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from("members").insert({
        full_name: formData.fullName,
        phone_number: formData.phoneNumber,
        department: department as any,
        leader_id: leaderId,
        status: "novo" as const,
      });

      if (error) throw error;

      toast.success("Membro cadastrado com sucesso!");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Erro ao cadastrar membro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Nome Completo</Label>
        <Input
          id="fullName"
          type="text"
          value={formData.fullName}
          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phoneNumber">Número de Telefone</Label>
        <Input
          id="phoneNumber"
          type="tel"
          value={formData.phoneNumber}
          onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
          placeholder="+258 XX XXX XXXX"
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Cadastrando..." : "Cadastrar Membro"}
      </Button>
    </form>
  );
};

export default CreateMemberForm;
