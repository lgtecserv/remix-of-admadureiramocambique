import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CreateTitheDialog } from "./CreateTitheDialog";
import { EditTitheDialog } from "./EditTitheDialog";

interface Tithe {
  id: string;
  member_id: string;
  amount: number;
  tithe_date: string;
  tithe_month: number;
  created_at: string;
  members: {
    full_name: string;
  };
}

export const TithesManagement = () => {
  const [tithes, setTithes] = useState<Tithe[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTithe, setSelectedTithe] = useState<Tithe | null>(null);
  const [stats, setStats] = useState({
    currentMonthTotal: 0,
    currentMonthCount: 0,
    previousMonthTotal: 0,
  });

  const loadTithes = async () => {
    const { data, error } = await supabase
      .from("tithes")
      .select("*, members(full_name)")
      .order("tithe_date", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar dízimos");
      return;
    }

    setTithes(data || []);
    calculateStats(data || []);
    setLoading(false);
  };

  const calculateStats = (data: Tithe[]) => {
    const currentMonth = new Date().getMonth() + 1;
    const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;

    const currentMonthTithes = data.filter((t) => t.tithe_month === currentMonth);
    const previousMonthTithes = data.filter((t) => t.tithe_month === previousMonth);

    setStats({
      currentMonthTotal: currentMonthTithes.reduce((sum, t) => sum + t.amount, 0),
      currentMonthCount: currentMonthTithes.length,
      previousMonthTotal: previousMonthTithes.reduce((sum, t) => sum + t.amount, 0),
    });
  };

  useEffect(() => {
    loadTithes();

    const channel = supabase
      .channel("tithes-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tithes" },
        () => loadTithes()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este dízimo?")) return;

    const { error } = await supabase.from("tithes").delete().eq("id", id);

    if (error) {
      toast.error("Erro ao excluir dízimo");
      return;
    }

    toast.success("Dízimo excluído com sucesso");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-MZ", {
      style: "currency",
      currency: "MZN",
    }).format(value);
  };

  const getMonthName = (month: number) => {
    const months = [
      "Janeiro",
      "Fevereiro",
      "Março",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro",
    ];
    return months[month - 1];
  };

  const growth =
    stats.previousMonthTotal > 0
      ? ((stats.currentMonthTotal - stats.previousMonthTotal) /
          stats.previousMonthTotal) *
        100
      : 0;

  if (loading) {
    return <div className="text-center py-8">Carregando dízimos...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total do Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.currentMonthTotal)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Dizimistas Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.currentMonthCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Crescimento</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                growth >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {growth >= 0 ? "+" : ""}
              {growth.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex sm:justify-end">
        <Button onClick={() => setCreateDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Registrar Dízimo
        </Button>
      </div>

      <div className="space-y-3">
        {tithes.map((tithe) => (
          <Card key={tithe.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{tithe.members.full_name}</CardTitle>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(tithe.amount)}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Mês Referente:</span>
                <span className="font-medium">{getMonthName(tithe.tithe_month)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Data de Registro:</span>
                <span className="font-medium">
                  {format(new Date(tithe.tithe_date), "dd/MM/yyyy", {
                    locale: ptBR,
                  })}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setSelectedTithe(tithe);
                    setEditDialogOpen(true);
                  }}
                >
                  <Pencil className="h-3 w-3 mr-2" />
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="w-full sm:w-auto"
                  onClick={() => handleDelete(tithe.id)}
                >
                  <Trash2 className="h-3 w-3 mr-2" />
                  Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {tithes.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum dízimo registrado
        </div>
      )}

      <CreateTitheDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          setCreateDialogOpen(false);
          loadTithes();
        }}
      />

      {selectedTithe && (
        <EditTitheDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          tithe={selectedTithe}
          onSuccess={() => {
            setEditDialogOpen(false);
            loadTithes();
          }}
        />
      )}
    </div>
  );
};
