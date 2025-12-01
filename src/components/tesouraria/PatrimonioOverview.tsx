import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Asset {
  id: string;
  name: string;
  quantity: number;
  condition: string;
  image_url: string | null;
  observations: string | null;
}

export const PatrimonioOverview = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [conditionFilter, setConditionFilter] = useState<string>("all");

  useEffect(() => {
    loadAssets();

    // Real-time updates
    const channel = supabase
      .channel('church_assets_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'church_assets'
        },
        () => {
          loadAssets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (conditionFilter === "all") {
      setFilteredAssets(assets);
    } else {
      setFilteredAssets(assets.filter(asset => asset.condition === conditionFilter));
    }
  }, [conditionFilter, assets]);

  const loadAssets = async () => {
    try {
      const { data, error } = await supabase
        .from("church_assets")
        .select("*")
        .order("name");

      if (error) throw error;
      setAssets(data || []);
      setFilteredAssets(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar inventário", {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const getConditionBadge = (condition: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      perfeito: { label: "Perfeito", className: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20" },
      bom: { label: "Bom", className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20" },
      regular: { label: "Regular", className: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20" },
      danificado: { label: "Danificado", className: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20" }
    };
    return variants[condition] || { label: condition, className: "" };
  };

  const stats = {
    total: assets.length,
    perfeito: assets.filter(a => a.condition === "perfeito").length,
    danificado: assets.filter(a => a.condition === "danificado").length,
    totalItems: assets.reduce((sum, a) => sum + a.quantity, 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com Estatísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total de Tipos</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total de Itens</CardDescription>
            <CardTitle className="text-2xl">{stats.totalItems}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Perfeitos</CardDescription>
            <CardTitle className="text-2xl text-green-600">{stats.perfeito}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Danificados</CardDescription>
            <CardTitle className="text-2xl text-red-600">{stats.danificado}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Inventário do Patrimônio</h3>
          <p className="text-sm text-muted-foreground">Visualização apenas leitura</p>
        </div>
        <Select value={conditionFilter} onValueChange={setConditionFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filtrar por condição" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Condições</SelectItem>
            <SelectItem value="perfeito">Perfeito</SelectItem>
            <SelectItem value="bom">Bom</SelectItem>
            <SelectItem value="regular">Regular</SelectItem>
            <SelectItem value="danificado">Danificado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de Assets */}
      {filteredAssets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum item encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssets.map((asset) => {
            const conditionBadge = getConditionBadge(asset.condition);
            return (
              <Card key={asset.id} className="overflow-hidden">
                {asset.image_url && (
                  <div className="aspect-video w-full overflow-hidden bg-muted">
                    <img
                      src={asset.image_url}
                      alt={asset.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{asset.name}</CardTitle>
                    <Badge variant="outline" className={conditionBadge.className}>
                      {conditionBadge.label}
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Quantidade: {asset.quantity}
                  </CardDescription>
                </CardHeader>
                {asset.observations && (
                  <CardContent>
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <p className="line-clamp-2">{asset.observations}</p>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
