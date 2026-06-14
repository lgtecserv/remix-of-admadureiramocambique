import { useState } from "react";
import { supabase, getStatusLabel } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { z } from "zod";
import MemberPhotoUpload from "./MemberPhotoUpload";

const editMemberSchema = z.object({
  fullName: z.string()
    .trim()
    .min(1, "Nome é obrigatório")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  phoneNumber: z.string()
    .trim()
    .min(1, "Telefone é obrigatório")
    .max(20, "Telefone deve ter no máximo 20 caracteres")
    .regex(/^\+?[0-9\s\-()]+$/, "Formato de telefone inválido"),
  status: z.enum(["novo", "ativo", "inativo"]),
  gender: z.string().optional(),
  memberType: z.string().optional(),
  photoUrl: z.string().optional(),
  churchFunction: z.string().trim().max(120).optional(),
  churchOffice: z.string().optional(),
});

interface EditMemberFormProps {
  member: {
    id: string;
    full_name: string;
    phone_number: string;
    status: string;
    gender?: string | null;
    member_type?: string | null;
    photo_url?: string | null;
    church_function?: string | null;
    church_office?: string | null;
  };
  onSuccess: () => void;
}

const statuses = ["novo", "ativo", "inativo"];
const genders = [
  { value: "masculino", label: "Masculino" },
  { value: "feminino", label: "Feminino" },
];
const memberTypes = [
  { value: "obreiro", label: "Obreiro" },
  { value: "congregado", label: "Congregado" },
  { value: "membro", label: "Membro da Igreja" },
];
const churchOffices = [
  { value: "cooperador", label: "Cooperador" },
  { value: "diacono", label: "Diácono" },
  { value: "presbitero", label: "Presbítero" },
  { value: "pastor", label: "Pastor" },
  { value: "evangelista", label: "Evangelista" },
  { value: "missionario", label: "Missionária/o" },
];

const EditMemberForm = ({ member, onSuccess }: EditMemberFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: member.full_name,
    phoneNumber: member.phone_number,
    status: member.status,
    gender: member.gender || "",
    memberType: member.member_type || "membro",
    photoUrl: member.photo_url || "",
    churchFunction: member.church_function || "",
    churchOffice: member.church_office || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validatedData = editMemberSchema.parse(formData);

      const { error } = await supabase
        .from("members")
        .update({
          full_name: validatedData.fullName,
          phone_number: validatedData.phoneNumber,
          status: validatedData.status as any,
          gender: validatedData.gender || null,
          member_type: validatedData.memberType || null,
          photo_url: validatedData.photoUrl || null,
          church_function: validatedData.churchFunction || null,
          church_office: validatedData.churchOffice || null,
        } as any)
        .eq("id", member.id);

      if (error) throw error;

      toast.success("Membro atualizado com sucesso!");
      onSuccess();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Erro ao atualizar membro");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <MemberPhotoUpload
        photoUrl={formData.photoUrl}
        onPhotoChange={(url) => setFormData({ ...formData, photoUrl: url })}
        memberName={formData.fullName}
      />

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
          maxLength={20}
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="gender">Sexo</Label>
          <Select
            value={formData.gender}
            onValueChange={(value) => setFormData({ ...formData, gender: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {genders.map((gender) => (
                <SelectItem key={gender.value} value={gender.value}>
                  {gender.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="memberType">Tipo de Membro</Label>
          <Select
            value={formData.memberType}
            onValueChange={(value) => setFormData({ ...formData, memberType: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {memberTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="churchOffice">Cargo na Igreja</Label>
          <Select
            value={formData.churchOffice}
            onValueChange={(value) => setFormData({ ...formData, churchOffice: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {churchOffices.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="churchFunction">Função na Igreja</Label>
          <Input
            id="churchFunction"
            type="text"
            value={formData.churchFunction}
            onChange={(e) => setFormData({ ...formData, churchFunction: e.target.value })}
            maxLength={120}
            placeholder="Ex: dirigente de louvor"
          />
        </div>
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
