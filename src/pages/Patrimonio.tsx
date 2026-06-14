import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { Loader2, Package, LayoutGrid, List } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { useSelectedCongregation } from "@/contexts/SelectedCongregationContext";

interface Asset {
  id: string;
  name: string;
  quantity: number;
  condition: string;
  image_url: string | null;
  observations: string | null;
  congregation_id?: string;
}

const Patrimonio = () => {
  const navigate = useNavigate();
  const { selectedCongregationId, isSuperAdmin } = useSelectedCongregation();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [userDepartment, setUserDepartment] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filter, setFilter] = useState<string>("all");

  const loadAssets = async () => {
    let query = supabase
      .from("church_assets")
      .select("*")
      .order("created_at", { ascending: false });

    if (selectedCongregationId && selectedCongregationId !== "all") {
      query = query.eq("congregation_id", selectedCongregationId);
    }

    const { data: assetsData } = await query;
    setAssets(assetsData || []);
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role, department")
        .eq("user_id", session.user.id)
        .single();

      const isSuperAdminOrSecretary = roleData?.role === "super_admin" || roleData?.role === "secretary";
      if (!roleData || (!isSuperAdminOrSecretary && roleData.department !== "patrimonio")) {
        navigate("/dashboard");
        return;
      }

      setUserRole(roleData.role);
      setUserDepartment(roleData.department || "");

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", session.user.id)
        .single();

      setProfile(profileData);

      await loadAssets();
      setLoading(false);
    };

    checkAuth();

    // Real-time subscription
    const channel = supabase
      .channel("assets-gallery-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "church_assets" },
        () => loadAssets()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate, selectedCongregationId]);

  const filteredAssets = assets.filter((asset) => {
    if (filter === "all") return true;
    return asset.condition?.toLowerCase() === filter.toLowerCase();
  });

  const getConditionBadge = (condition: string) => {
    if (condition?.toLowerCase() === "perfeito") {
      return <Badge className="bg-green-500">Perfeito</Badge>;
    }
    return <Badge variant="destructive">Danificado</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout userName={profile?.full_name} role={userRole} department={userDepartment} userEmail={user?.email} user={user}>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Galeria do Patrimônio
          </h2>
          <p className="text-muted-foreground">
            Visualize todos os recursos disponíveis na igreja
          </p>
        </div>

        {/* Filtros e Views */}
        <Tabs defaultValue="table" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                onClick={() => setFilter("all")}
                size="sm"
              >
                Todos ({assets.length})
              </Button>
              <Button
                variant={filter === "perfeito" ? "default" : "outline"}
                onClick={() => setFilter("perfeito")}
                size="sm"
              >
                Perfeito ({assets.filter((a) => a.condition?.toLowerCase() === "perfeito").length})
              </Button>
              <Button
                variant={filter === "danificado" ? "default" : "outline"}
                onClick={() => setFilter("danificado")}
                size="sm"
              >
                Danificado ({assets.filter((a) => a.condition?.toLowerCase() === "danificado").length})
              </Button>
            </div>
            
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
          </div>

          <TabsContent value="cards" className="m-0">
            {/* Galeria */}
            {filteredAssets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p>Nenhum item encontrado nesta categoria</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
                {filteredAssets.map((asset) => (
                  <Card key={asset.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="aspect-square bg-muted relative">
                      {asset.image_url ? (
                        <img
                          src={asset.image_url}
                          alt={asset.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-16 w-16 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        {getConditionBadge(asset.condition)}
                      </div>
                    </div>
                    <CardContent className="p-4 space-y-2">
                      <h3 className="font-semibold text-base truncate">{asset.name}</h3>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Quantidade:</span>
                        <span className="font-medium">{asset.quantity}</span>
                      </div>
                      {asset.observations && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {asset.observations}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="table" className="m-0">
            <div className="bg-card rounded-md border mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Condição</TableHead>
                    <TableHead>Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssets.map((asset) => (
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
                      <TableCell className="max-w-[400px] truncate text-muted-foreground">
                        {asset.observations || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredAssets.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                        Nenhum item encontrado nesta categoria
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Patrimonio;
