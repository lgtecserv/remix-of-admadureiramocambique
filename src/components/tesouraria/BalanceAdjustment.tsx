import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Adjustment {
  id: string;
  amount: number;
  description: string;
  adjustment_date: string;
  created_at: string;
}

export const BalanceAdjustment = () => {
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [adjustmentDate, setAdjustmentDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const loadAdjustments = async () => {
    const { data, error } = await supabase
      .from("balance_adjustments")
      .select("*")
      .order("adjustment_date", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar ajustes");
      return;
    }

    setAdjustments(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadAdjustments();

    const channel = supabase
      .channel("balance-adjustments-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "balance_adjustments" },
        () => loadAdjustments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Usuário não autenticado");
      return;
    }

    const { error } = await supabase.from("balance_adjustments").insert({
      amount: parseFloat(amount),
      description,
      adjustment_date: adjustmentDate,
      recorded_by: user.id,
    });

    if (error) {
      toast.error("Erro ao registrar ajuste");
      return;
    }

    toast.success("Ajuste registrado com sucesso");
    setAmount("");
    setDescription("");
    setAdjustmentDate(format(new Date(), "yyyy-MM-dd"));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este ajuste?")) return;

    const { error } = await supabase.from("balance_adjustments").delete().eq("id", id);

    if (error) {
      toast.error("Erro ao excluir ajuste");
      return;
    }

    toast.success("Ajuste excluído com sucesso");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-MZ", {
      style: "currency",
      currency: "MZN",
    }).format(value);
  };

  if (loading) {
    return <div className="text-center py-8">Carregando ajustes...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Registrar Ajuste de Saldo</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Valor (positivo ou negativo)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Ex: 1000 ou -500"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adjustment_date">Data</Label>
                <Input
                  id="adjustment_date"
                  type="date"
                  value={adjustmentDate}
                  onChange={(e) => setAdjustmentDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o motivo do ajuste"
                required
              />
            </div>

            <Button type="submit" className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Registrar Ajuste
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Histórico de Ajustes</h3>
        {adjustments.map((adjustment) => (
          <Card key={adjustment.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{adjustment.description}</CardTitle>
                <span
                  className={`text-lg font-bold ${
                    adjustment.amount >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {adjustment.amount >= 0 ? "+" : ""}
                  {formatCurrency(adjustment.amount)}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Data:</span>
                <span className="font-medium">
                  {format(new Date(adjustment.adjustment_date), "dd/MM/yyyy", {
                    locale: ptBR,
                  })}
                </span>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(adjustment.id)}
                >
                  <Trash2 className="h-3 w-3 mr-2" />
                  Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {adjustments.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum ajuste registrado
        </div>
      )}
    </div>
  );
};
