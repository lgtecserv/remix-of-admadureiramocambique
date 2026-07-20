import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CreateOfferingDialog } from "./CreateOfferingDialog";
import { EditOfferingDialog } from "./EditOfferingDialog";

interface Offering {
  id: string;
  event_date: string;
  event_type: string;
  amount: number;
  notes: string | null;
  verified_by_names: string[] | null;
  created_at: string;
}

export const OfferingsManagement = () => {
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedOffering, setSelectedOffering] = useState<Offering | null>(null);

  const loadOfferings = async () => {
    const { data, error } = await supabase
      .from("offerings")
      .select("*")
      .order("event_date", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar ofertas");
      return;
    }

    setOfferings(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadOfferings();

    const channel = supabase
      .channel("offerings-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "offerings" },
        () => loadOfferings()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta oferta?")) return;

    const { error } = await supabase.from("offerings").delete().eq("id", id);

    if (error) {
      toast.error("Erro ao excluir oferta");
      return;
    }

    toast.success("Oferta excluída com sucesso");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-MZ", {
      style: "currency",
      currency: "MZN",
    }).format(value);
  };

  if (loading) {
    return <div className="text-center py-8">Carregando ofertas...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex sm:justify-end">
        <Button onClick={() => setCreateDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Registrar Oferta
        </Button>
      </div>

      <div className="space-y-3">
        {offerings.map((offering) => (
          <Card key={offering.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{offering.event_type}</CardTitle>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(offering.amount)}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Data:</span>
                <span className="font-medium">
                  {format(new Date(offering.event_date), "dd/MM/yyyy", {
                    locale: ptBR,
                  })}
                </span>
              </div>
              {offering.verified_by_names && offering.verified_by_names.length > 0 && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Conferido por: </span>
                  <span className="font-medium">
                    {offering.verified_by_names.join(", ")}
                  </span>
                </div>
              )}
              {offering.notes && (
                <p className="text-sm text-muted-foreground">{offering.notes}</p>
              )}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setSelectedOffering(offering);
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
                  onClick={() => handleDelete(offering.id)}
                >
                  <Trash2 className="h-3 w-3 mr-2" />
                  Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {offerings.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Nenhuma oferta registrada
        </div>
      )}

      <CreateOfferingDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          setCreateDialogOpen(false);
          loadOfferings();
        }}
      />

      {selectedOffering && (
        <EditOfferingDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          offering={selectedOffering}
          onSuccess={() => {
            setEditDialogOpen(false);
            loadOfferings();
          }}
        />
      )}
    </div>
  );
};
