import { useState, useEffect } from "react";
import { supabase, getCurrentUserCongregationId } from "@/lib/supabase";
import { useSelectedCongregation } from "@/contexts/SelectedCongregationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  department?: string;
  leaderId: string;
  onSuccess: () => void;
  defaultType?: "membro" | "congregado";
  role?: string | null;
}

const CreateMemberForm = ({ department, leaderId, onSuccess, defaultType = "membro", role }: CreateMemberFormProps) => {
  const [loading, setLoading] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string>(department || "");
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
    memberType: defaultType,
    photoUrl: "",
    churchFunction: "",
    churchOffice: "",
  });

  const { isSuperAdmin, getEffectiveCongregationId } = useSelectedCongregation();
  const congId = getEffectiveCongregationId();

  const [selectedCongregation, setSelectedCongregation] = useState<string>("");
  const [congregations, setCongregations] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (congId) {
      setSelectedCongregation(congId);
    }
  }, [congId]);

  const showCongregationDropdown = isSuperAdmin || role === "secretary" || role === "super_admin";

  useEffect(() => {
    if (showCongregationDropdown) {
      supabase.from("congregations").select("id, name").eq("active", true).order("name").then(({ data }) => {
        if (data) setCongregations(data);
      });
    }
  }, [showCongregationDropdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input
      if (!selectedDepartment) {
        toast.error("Por favor, selecione um departamento");
        setLoading(false);
        return;
      }

      const validatedData = memberSchema.parse(formData);

      let finalCongId = showCongregationDropdown ? selectedCongregation : congId;
      if (!finalCongId) {
        finalCongId = await getCurrentUserCongregationId();
      }
      
      if (!finalCongId) throw new Error("Congregação não encontrada");

      const { error } = await supabase.from("members").insert({
        full_name: validatedData.fullName,
        phone_number: validatedData.phoneNumber,
        department: selectedDepartment as any,
        leader_id: leaderId,
        status: "novo" as const,
        congregation_id: finalCongId,
        address: validatedData.address || null,
        birth_date: validatedData.birthDate || null,
        marital_status: validatedData.maritalStatus || null,
        occupation: validatedData.occupation || null,
        baptism_date: validatedData.baptismDate || null,
        observations: validatedData.observations || null,
        gender: validatedData.gender || null,
        member_type: validatedData.memberType || defaultType,
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

      {!department && (
        <div className="space-y-2">
          <Label>Departamento</Label>
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment} required>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um departamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="jovens">Jovens</SelectItem>
              <SelectItem value="irmas">Irmãs</SelectItem>
              <SelectItem value="varoes">Varões</SelectItem>
              <SelectItem value="adolescentes">Adolescentes</SelectItem>
              <SelectItem value="criancas">Crianças</SelectItem>
              <SelectItem value="patrimonio">Patrimônio</SelectItem>
              <SelectItem value="tesouraria">Tesouraria</SelectItem>
              <SelectItem value="diaconato">Diaconato</SelectItem>
              <SelectItem value="musica">Música</SelectItem>
              <SelectItem value="ensino">Ensino</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {showCongregationDropdown && (
        <div className="space-y-2">
          <Label htmlFor="congregation">Congregação</Label>
          <Select
            value={selectedCongregation}
            onValueChange={setSelectedCongregation}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione a congregação" />
            </SelectTrigger>
            <SelectContent>
              {congregations.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

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
