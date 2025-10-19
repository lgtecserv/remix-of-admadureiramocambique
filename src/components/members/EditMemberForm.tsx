import { useState } from "react";
import { supabase, getStatusLabel } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface EditMemberFormProps {
  member: {
    id: string;
    full_name: string;
    phone_number: string;
    status: string;
  };
  onSuccess: () => void;
}

const statuses = ["novo", "ativo", "inativo"];

const EditMemberForm = ({ member, onSuccess }: EditMemberFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: member.full_name,
    phoneNumber: member.phone_number,
    status: member.status,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("members")
        .update({
          full_name: formData.fullName,
          phone_number: formData.phoneNumber,
          status: formData.status as any,
        })
        .eq("id", member.id);

      if (error) throw error;

      toast.success("Membro atualizado com sucesso!");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar membro");
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
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select
          value={formData.status}
          onValueChange={(value) => setFormData({ ...formData, status: value })}
          required
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((status) => (
              <SelectItem key={status} value={status}>
                {getStatusLabel(status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Atualizando..." : "Atualizar Membro"}
      </Button>
    </form>
  );
};

export default EditMemberForm;
