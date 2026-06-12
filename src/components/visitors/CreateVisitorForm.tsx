import { useState } from "react";
import { supabase, getCurrentUserCongregationId } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { z } from "zod";
import { DuplicateVisitorDialog } from "./DuplicateVisitorDialog";

const visitorSchema = z.object({
  fullName: z.string()
    .trim()
    .min(1, "Nome é obrigatório")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  phoneNumber: z.string()
    .trim()
    .min(1, "Telefone é obrigatório")
    .max(20, "Telefone deve ter no máximo 20 caracteres")
    .regex(/^\+?[0-9\s\-()]+$/, "Formato de telefone inválido"),
  invitedBy: z.string().max(100, "Nome deve ter no máximo 100 caracteres").optional(),
  observations: z.string().max(500, "Observações devem ter no máximo 500 caracteres").optional(),
});

interface CreateVisitorFormProps {
  onSuccess: () => void;
  user: User;
  userDepartment?: string;
}

const CreateVisitorForm = ({ onSuccess, user, userDepartment }: CreateVisitorFormProps) => {
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [visitDate, setVisitDate] = useState<Date>(new Date());
  const [invitedBy, setInvitedBy] = useState("");
  const [observations, setObservations] = useState("");
  const [department, setDepartment] = useState(userDepartment || "");
  const [loading, setLoading] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateVisitor, setDuplicateVisitor] = useState<any>(null);
  const [pendingData, setPendingData] = useState<any>(null);

  const checkForDuplicate = async (name: string, phone: string) => {
    const normalizedName = name.toLowerCase().trim();
    const normalizedPhone = phone.replace(/\D/g, "");

    // Use separate safe queries to prevent SQL injection
    const { data: nameMatches } = await supabase
      .from("visitors")
      .select("id, full_name, phone_number, visit_date")
      .ilike("full_name", `%${normalizedName}%`);

    const { data: phoneMatches } = await supabase
      .from("visitors")
      .select("id, full_name, phone_number, visit_date")
      .eq("phone_number", phone);

    // Merge results and return first match
    const allMatches = [...(nameMatches || []), ...(phoneMatches || [])];
    return allMatches.length > 0 ? allMatches[0] : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validatedData = visitorSchema.parse({
        fullName,
        phoneNumber,
        invitedBy,
        observations,
      });

      const duplicate = await checkForDuplicate(validatedData.fullName, validatedData.phoneNumber);

      if (duplicate) {
        setPendingData({
          full_name: validatedData.fullName,
          phone_number: validatedData.phoneNumber,
          invited_by: validatedData.invitedBy || "",
          observations: validatedData.observations || "",
          department: department as any,
          visit_date: format(visitDate, "yyyy-MM-dd"),
          leader_id: user.id,
        });
        setDuplicateVisitor(duplicate);
        setShowDuplicateDialog(true);
        setLoading(false);
        return;
      }

      await insertVisitor(validatedData);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error("Error creating visitor:", error);
        toast.error("Erro ao cadastrar visitante");
      }
      setLoading(false);
    }
  };

  const insertVisitor = async (validatedData: any) => {
    const { error } = await supabase.from("visitors").insert({
      full_name: validatedData.fullName,
      phone_number: validatedData.phoneNumber,
      visit_date: format(visitDate, "yyyy-MM-dd"),
      invited_by: validatedData.invitedBy || "",
      observations: validatedData.observations || "",
      department: department as any,
      leader_id: user.id,
    });

    if (error) throw error;

    toast.success("Visitante cadastrado com sucesso!");
    resetForm();
    onSuccess();
  };

  const handleMarkAsReturn = async () => {
    if (!duplicateVisitor) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from("visitors")
        .update({
          returned: true,
          visit_date: format(visitDate, "yyyy-MM-dd"),
        })
        .eq("id", duplicateVisitor.id);

      if (error) throw error;

      toast.success("Visitante marcado como retorno!");
      resetForm();
      setShowDuplicateDialog(false);
      onSuccess();
    } catch (error) {
      console.error("Error marking as return:", error);
      toast.error("Erro ao marcar retorno");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = async () => {
    if (!pendingData) return;
    setLoading(true);

    try {
      const { error } = await supabase.from("visitors").insert(pendingData);

      if (error) throw error;

      toast.success("Nova visita cadastrada!");
      resetForm();
      setShowDuplicateDialog(false);
      onSuccess();
    } catch (error) {
      console.error("Error creating new visit:", error);
      toast.error("Erro ao cadastrar nova visita");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFullName("");
    setPhoneNumber("");
    setInvitedBy("");
    setObservations("");
    setVisitDate(new Date());
    setDuplicateVisitor(null);
    setPendingData(null);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="fullName">Nome Completo *</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            maxLength={100}
            required
          />
        </div>

        <div>
          <Label htmlFor="phoneNumber">Telefone *</Label>
          <Input
            id="phoneNumber"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            maxLength={20}
            required
          />
        </div>

        <div>
          <Label>Data da Visita *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(visitDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={visitDate}
                onSelect={(date) => date && setVisitDate(date)}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <Label htmlFor="invitedBy">Convidado por</Label>
          <Input
            id="invitedBy"
            value={invitedBy}
            onChange={(e) => setInvitedBy(e.target.value)}
            maxLength={100}
          />
        </div>

        {!userDepartment && (
          <div>
            <Label htmlFor="department">Departamento *</Label>
            <Select value={department} onValueChange={setDepartment} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="jovens">Jovens</SelectItem>
                <SelectItem value="irmas">Irmãs</SelectItem>
                <SelectItem value="varoes">Varões</SelectItem>
                <SelectItem value="adolescentes">Adolescentes</SelectItem>
                <SelectItem value="criancas">Crianças</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <Label htmlFor="observations">Observações</Label>
          <Textarea
            id="observations"
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            maxLength={500}
            rows={3}
          />
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Cadastrando..." : "Cadastrar Visitante"}
        </Button>
      </form>

      <DuplicateVisitorDialog
        open={showDuplicateDialog}
        onOpenChange={setShowDuplicateDialog}
        duplicateVisitor={duplicateVisitor}
        onMarkAsReturn={handleMarkAsReturn}
        onCreateNew={handleCreateNew}
      />
    </>
  );
};

export default CreateVisitorForm;