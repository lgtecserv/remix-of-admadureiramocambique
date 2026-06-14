import { useState } from "react";
import { supabase, getCurrentUserCongregationId } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";
import AdditionalMemberFields from "./AdditionalMemberFields";

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
  address: z.string().trim().max(200).optional(),
  birthDate: z.string().optional(),
  maritalStatus: z.enum(["solteiro", "casado", "divorciado", "viuvo"]).optional(),
  occupation: z.string().trim().max(100).optional(),
  baptismDate: z.string().optional(),
  observations: z.string().trim().max(500).optional(),
  gender: z.enum(["masculino", "feminino"]).optional(),
  memberType: z.enum(["obreiro", "congregado", "membro"]).optional(),
  photoUrl: z.string().optional(),
  churchFunction: z.string().trim().max(120).optional(),
  churchOffice: z.string().optional(),
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
    address: "",
    birthDate: "",
    maritalStatus: "",
    occupation: "",
    baptismDate: "",
    observations: "",
    gender: "",
    memberType: "membro",
    photoUrl: "",
    churchFunction: "",
    churchOffice: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input
      const validatedData = memberSchema.parse(formData);

      const congregation_id = await getCurrentUserCongregationId();
      if (!congregation_id) throw new Error("Congregação não encontrada");

      const { error } = await supabase.from("members").insert({
        full_name: validatedData.fullName,
        phone_number: validatedData.phoneNumber,
        department: department as any,
        leader_id: leaderId,
        status: "novo" as const,
        congregation_id,
        address: validatedData.address || null,
        birth_date: validatedData.birthDate || null,
        marital_status: validatedData.maritalStatus || null,
        occupation: validatedData.occupation || null,
        baptism_date: validatedData.baptismDate || null,
        observations: validatedData.observations || null,
        gender: validatedData.gender || null,
        member_type: validatedData.memberType || "membro",
        photo_url: validatedData.photoUrl || null,
        church_function: validatedData.churchFunction || null,
        church_office: validatedData.churchOffice || null,
      } as any);

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

      <AdditionalMemberFields formData={formData} setFormData={setFormData} memberName={formData.fullName} />

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Cadastrando..." : "Cadastrar Membro"}
      </Button>
    </form>
  );
};

export default CreateMemberForm;
