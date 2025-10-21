import { useState } from "react";
import { supabase } from "@/lib/supabase";
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from("visitors").insert({
      full_name: fullName,
      phone_number: phoneNumber,
      visit_date: format(visitDate, "yyyy-MM-dd"),
      invited_by: invitedBy,
      observations: observations,
      department: department as any,
      leader_id: user.id,
    });

    if (error) {
      toast.error("Erro ao cadastrar visitante");
      console.error(error);
    } else {
      toast.success("Visitante cadastrado com sucesso!");
      setFullName("");
      setPhoneNumber("");
      setVisitDate(new Date());
      setInvitedBy("");
      setObservations("");
      onSuccess();
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="fullName">Nome Completo *</Label>
        <Input
          id="fullName"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
      </div>

      <div>
        <Label htmlFor="phoneNumber">Telefone *</Label>
        <Input
          id="phoneNumber"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
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
          rows={3}
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Cadastrando..." : "Cadastrar Visitante"}
      </Button>
    </form>
  );
};

export default CreateVisitorForm;
