import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";

const memberSchema = z.object({
  fullName: z.string()
    .trim()
    .min(1, "Nome é obrigatório")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  phoneNumber: z.string()
    .trim()
    .min(1, "Telefone é obrigatório")
    .max(20, "Telefone deve ter no máximo 20 caracteres")
    .regex(/^\+?[0-9\s\-()]+$/, "Formato de telefone inválido"),
});

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
      // Validate input
      const validatedData = memberSchema.parse(formData);

      const { error } = await supabase.from("members").insert({
        full_name: validatedData.fullName,
        phone_number: validatedData.phoneNumber,
        department: department as any,
        leader_id: leaderId,
        status: "novo" as const,
      });

      if (error) throw error;

      toast.success("Membro cadastrado com sucesso!");
      onSuccess();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Erro ao cadastrar membro");
      }
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
          maxLength={100}
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
          maxLength={20}
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
