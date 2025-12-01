import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { format } from "date-fns";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Tithe {
  id: string;
  member_id?: string;
  amount: number;
  tithe_date: string;
  tithe_month: number;
  members?: {
    full_name: string;
  };
}

interface Member {
  id: string;
  full_name: string;
}

interface EditTitheDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tithe: Tithe;
  onSuccess: () => void;
}

export const EditTitheDialog = ({ open, onOpenChange, tithe, onSuccess }: EditTitheDialogProps) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [memberOpen, setMemberOpen] = useState(false);
  const [memberId, setMemberId] = useState(tithe.member_id || "");
  const [amount, setAmount] = useState(tithe.amount.toString());
  const [titheDate, setTitheDate] = useState(format(new Date(tithe.tithe_date), "yyyy-MM-dd"));
  const [titheMonth, setTitheMonth] = useState(tithe.tithe_month.toString());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    const { data } = await supabase.from("members").select("id, full_name").order("full_name");
    if (data) setMembers(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from("tithes")
      .update({
        member_id: memberId,
        amount: parseFloat(amount),
        tithe_date: titheDate,
        tithe_month: parseInt(titheMonth),
      })
      .eq("id", tithe.id);

    setLoading(false);

    if (error) {
      toast.error("Erro ao atualizar dízimo");
      return;
    }

    toast.success("Dízimo atualizado com sucesso");
    onSuccess();
    onOpenChange(false);
  };

  const months = [
    { value: "1", label: "Janeiro" },
    { value: "2", label: "Fevereiro" },
    { value: "3", label: "Março" },
    { value: "4", label: "Abril" },
    { value: "5", label: "Maio" },
    { value: "6", label: "Junho" },
    { value: "7", label: "Julho" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Setembro" },
    { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" },
    { value: "12", label: "Dezembro" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Dízimo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="member">Membro</Label>
            <Popover open={memberOpen} onOpenChange={setMemberOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={memberOpen}
                  className="w-full justify-between"
                >
                  {memberId
                    ? members.find((member) => member.id === memberId)?.full_name
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
                            setMemberId(member.id);
                            setMemberOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              memberId === member.id ? "opacity-100" : "opacity-0"
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tithe_date">Data do Pagamento</Label>
              <Input
                id="tithe_date"
                type="date"
                value={titheDate}
                onChange={(e) => setTitheDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tithe_month">Mês Referente</Label>
            <Select value={titheMonth} onValueChange={setTitheMonth}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o mês" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
