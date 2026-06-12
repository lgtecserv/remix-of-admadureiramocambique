import { useState, useEffect } from "react";
import { supabase, getCurrentUserCongregationId } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { toast } from "sonner";
import { Loader2, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Member {
  id: string;
  full_name: string;
}

interface CreateTitheDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreateTitheDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: CreateTitheDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberOpen, setMemberOpen] = useState(false);
  const [formData, setFormData] = useState({
    member_id: "",
    amount: "",
    tithe_month: new Date().getMonth() + 1,
    tithe_date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    const loadMembers = async () => {
      const { data } = await supabase
        .from("members")
        .select("id, full_name")
        .order("full_name");
      if (data) setMembers(data);
    };
    loadMembers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const congregation_id = await getCurrentUserCongregationId();
      if (!congregation_id) throw new Error("Congregação não encontrada");

      const { error } = await supabase.from("tithes").insert({
        member_id: formData.member_id,
        amount: parseFloat(formData.amount),
        tithe_month: formData.tithe_month,
        tithe_date: formData.tithe_date,
        recorded_by: user.id,
        congregation_id,
      });

      if (error) throw error;

      toast.success("Dízimo registrado com sucesso!");
      setFormData({
        member_id: "",
        amount: "",
        tithe_month: new Date().getMonth() + 1,
        tithe_date: new Date().toISOString().split("T")[0],
      });
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Erro ao registrar dízimo");
    } finally {
      setLoading(false);
    }
  };

  const months = [
    { value: 1, label: "Janeiro" },
    { value: 2, label: "Fevereiro" },
    { value: 3, label: "Março" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Maio" },
    { value: 6, label: "Junho" },
    { value: 7, label: "Julho" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Setembro" },
    { value: 10, label: "Outubro" },
    { value: 11, label: "Novembro" },
    { value: 12, label: "Dezembro" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[calc(100%-2rem)]">
        <DialogHeader>
          <DialogTitle>Registrar Dízimo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="member">Quem Dizimou *</Label>
            <Popover open={memberOpen} onOpenChange={setMemberOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={memberOpen}
                  className="w-full justify-between"
                >
                  {formData.member_id
                    ? members.find((member) => member.id === formData.member_id)?.full_name
                    : "Buscar membro..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar por nome..." />
                  <CommandList>
                    <CommandEmpty>Nenhum membro encontrado.</CommandEmpty>
                    <CommandGroup>
                      {members.map((member) => (
                        <CommandItem
                          key={member.id}
                          value={member.full_name}
                          onSelect={() => {
                            setFormData({ ...formData, member_id: member.id });
                            setMemberOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.member_id === member.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {member.full_name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Valor (MZN) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="month">Mês Referente *</Label>
            <Select
              value={formData.tithe_month.toString()}
              onValueChange={(value) =>
                setFormData({ ...formData, tithe_month: parseInt(value) })
              }
              required
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value.toString()}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tithe_date">Data de Registro *</Label>
            <Input
              id="tithe_date"
              type="date"
              value={formData.tithe_date}
              onChange={(e) =>
                setFormData({ ...formData, tithe_date: e.target.value })
              }
              required
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                "Registrar"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
