import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, Plus, Pencil, Trash2, LayoutGrid, List } from "lucide-react";
import { toast } from "sonner";
import { CreateAssetDialog } from "./CreateAssetDialog";
import { EditAssetDialog } from "./EditAssetDialog";

interface Asset {
  id: string;
  name: string;
  quantity: number;
  condition: string;
  image_url: string | null;
  observations: string | null;
  created_at: string;
}

export const AssetManagement = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);

  const loadAssets = async () => {
    const { data, error } = await supabase
      .from("church_assets")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar materiais");
      return;
    }

    setAssets(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadAssets();

    const channel = supabase
      .channel("assets-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "church_assets" },
        () => loadAssets()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este material?")) return;

    const { error } = await supabase.from("church_assets").delete().eq("id", id);

    if (error) {
      toast.error("Erro ao excluir material");
      return;
    }

    toast.success("Material excluído com sucesso");
  };

  const getConditionBadge = (condition: string) => {
    if (condition === "perfeito") {
      return <Badge className="bg-green-500">Perfeito</Badge>;
    }
    return <Badge variant="destructive">Danificado</Badge>;
  };

  if (loading) {
    return <div className="text-center py-8">Carregando materiais...</div>;
  }

  return (
    <Tabs defaultValue="table" className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <TabsList>
          <TabsTrigger value="table">
            <List className="w-4 h-4 mr-2" />
            Tabela
          </TabsTrigger>
          <TabsTrigger value="cards">
            <LayoutGrid className="w-4 h-4 mr-2" />
            Cards
          </TabsTrigger>
        </TabsList>
        <Button onClick={() => setCreateDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Cadastrar Item
        </Button>
      </div>

      <TabsContent value="cards" className="m-0 space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => (
            <Card key={asset.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{asset.name}</CardTitle>
                  </div>
                  {getConditionBadge(asset.condition)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {asset.image_url && (
                  <img
                    src={asset.image_url}
                    alt={asset.name}
                    className="w-full h-40 object-cover rounded-md"
                  />
                )}
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-medium">Quantidade:</span> {asset.quantity}
                  </p>
                  {asset.observations && (
                    <p className="text-muted-foreground line-clamp-2">
                      {asset.observations}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditAsset(asset)}
                    className="flex-1"
                  >
                    <Pencil className="mr-2 h-3 w-3" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(asset.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {assets.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum material cadastrado
          </div>
        )}
      </TabsContent>

      <TabsContent value="table" className="m-0">
        <div className="bg-card rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Condição</TableHead>
                <TableHead>Observações</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {asset.image_url ? (
                        <img
                          src={asset.image_url}
                          alt={asset.name}
                          className="w-10 h-10 rounded-md object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center">
                          <Package className="h-5 w-5 text-slate-400" />
                        </div>
                      )}
                      <span className="font-medium">{asset.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{asset.quantity}</TableCell>
                  <TableCell>{getConditionBadge(asset.condition)}</TableCell>
                  <TableCell className="max-w-[300px] truncate text-muted-foreground">
                    {asset.observations || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditAsset(asset)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(asset.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {assets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    Nenhum material cadastrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <CreateAssetDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          setCreateDialogOpen(false);
          loadAssets();
        }}
      />

      {editAsset && (
        <EditAssetDialog
          asset={editAsset}
          open={!!editAsset}
          onOpenChange={(open) => !open && setEditAsset(null)}
          onSuccess={() => {
            setEditAsset(null);
            loadAssets();
          }}
        />
      )}
    </Tabs>
  );
};
