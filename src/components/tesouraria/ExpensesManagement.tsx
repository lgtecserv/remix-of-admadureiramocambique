import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CreateExpenseDialog } from "./CreateExpenseDialog";
import { EditExpenseDialog } from "./EditExpenseDialog";

interface Expense {
  id: string;
  amount: number;
  expense_date: string;
  description: string;
  category: string;
  created_at: string;
}

export const ExpensesManagement = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  const loadExpenses = async () => {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("expense_date", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar gastos");
      return;
    }

    setExpenses(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadExpenses();

    const channel = supabase
      .channel("expenses-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        () => loadExpenses()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este gasto?")) return;

    const { error } = await supabase.from("expenses").delete().eq("id", id);

    if (error) {
      toast.error("Erro ao excluir gasto");
      return;
    }

    toast.success("Gasto excluído com sucesso");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-MZ", {
      style: "currency",
      currency: "MZN",
    }).format(value);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Água: "bg-blue-500",
      Luz: "bg-yellow-500",
      Material: "bg-purple-500",
      Manutenção: "bg-orange-500",
      Eventos: "bg-green-500",
      Outros: "bg-gray-500",
    };
    return colors[category] || "bg-gray-500";
  };

  if (loading) {
    return <div className="text-center py-8">Carregando gastos...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Registrar Gasto
        </Button>
      </div>

      <div className="space-y-3">
        {expenses.map((expense) => (
          <Card key={expense.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">{expense.description}</CardTitle>
                  <Badge className={getCategoryColor(expense.category)}>
                    {expense.category}
                  </Badge>
                </div>
                <span className="text-lg font-bold text-destructive">
                  - {formatCurrency(expense.amount)}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Data:</span>
                <span className="font-medium">
                  {format(new Date(expense.expense_date), "dd/MM/yyyy", {
                    locale: ptBR,
                  })}
                </span>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedExpense(expense);
                    setEditDialogOpen(true);
                  }}
                >
                  <Pencil className="h-3 w-3 mr-2" />
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(expense.id)}
                >
                  <Trash2 className="h-3 w-3 mr-2" />
                  Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {expenses.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum gasto registrado
        </div>
      )}

      <CreateExpenseDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          setCreateDialogOpen(false);
          loadExpenses();
        }}
      />

      {selectedExpense && (
        <EditExpenseDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          expense={selectedExpense}
          onSuccess={() => {
            setEditDialogOpen(false);
            loadExpenses();
          }}
        />
      )}
    </div>
  );
};
