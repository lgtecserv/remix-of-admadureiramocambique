import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { Loader2, Package } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface Asset {
  id: string;
  name: string;
  quantity: number;
  condition: string;
  image_url: string | null;
  observations: string | null;
}

const Patrimonio = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filter, setFilter] = useState<string>("all");

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

      if (!roleData || roleData.department !== "patrimonio") {
        navigate("/dashboard");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", session.user.id)
        .single();

      setProfile(profileData);

      // Carregar assets
      const { data: assetsData } = await supabase
        .from("church_assets")
        .select("*")
        .order("created_at", { ascending: false });

      setAssets(assetsData || []);
      setLoading(false);
    };

    checkAuth();

    // Real-time subscription
    const channel = supabase
      .channel("assets-gallery-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "church_assets" },
        async () => {
          const { data: assetsData } = await supabase
            .from("church_assets")
            .select("*")
            .order("created_at", { ascending: false });
          setAssets(assetsData || []);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate]);

  const filteredAssets = assets.filter((asset) => {
    if (filter === "all") return true;
    return asset.condition === filter;
  });

  const getConditionBadge = (condition: string) => {
    if (condition === "perfeito") {
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
    <AppLayout userName={profile?.full_name} role="leader" department="patrimonio" userEmail={user?.email} user={user}>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Galeria do Patrimônio
          </h2>
          <p className="text-muted-foreground">
            Visualize todos os recursos disponíveis na igreja
          </p>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 overflow-x-auto pb-2">
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
            Perfeito ({assets.filter((a) => a.condition === "perfeito").length})
          </Button>
          <Button
            variant={filter === "danificado" ? "default" : "outline"}
            onClick={() => setFilter("danificado")}
            size="sm"
          >
            Danificado ({assets.filter((a) => a.condition === "danificado").length})
          </Button>
        </div>

        {/* Galeria */}
        {filteredAssets.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <p>Nenhum item encontrado nesta categoria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
      </div>
    </AppLayout>
  );
};

export default Patrimonio;
