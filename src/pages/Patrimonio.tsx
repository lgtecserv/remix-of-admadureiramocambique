import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssetManagement } from "@/components/patrimonio/AssetManagement";
import { RequestManagement } from "@/components/patrimonio/RequestManagement";

const Patrimonio = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
        .select("full_name")
        .eq("id", session.user.id)
        .single();

      setProfile(profileData);
      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

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
            Gestão de Patrimônio
          </h2>
          <p className="text-muted-foreground">
            Gerencie os materiais e recursos da igreja
          </p>
        </div>

        <Tabs defaultValue="materials" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="materials">Materiais</TabsTrigger>
            <TabsTrigger value="requests">Solicitações</TabsTrigger>
          </TabsList>

          <TabsContent value="materials" className="space-y-4">
            <AssetManagement />
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            <RequestManagement />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Patrimonio;
