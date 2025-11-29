import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OfferingsManagement } from "@/components/tesouraria/OfferingsManagement";
import { TithesManagement } from "@/components/tesouraria/TithesManagement";
import { ExpensesManagement } from "@/components/tesouraria/ExpensesManagement";

const Tesouraria = () => {
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

      if (!roleData || roleData.department !== "tesouraria") {
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
    <AppLayout userName={profile?.full_name} role="leader" department="tesouraria" userEmail={user?.email} user={user}>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Gestão de Tesouraria
          </h2>
          <p className="text-muted-foreground">
            Gerencie as finanças da igreja
          </p>
        </div>

        <Tabs defaultValue="offerings" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="offerings">Ofertas</TabsTrigger>
            <TabsTrigger value="tithes">Dízimos</TabsTrigger>
            <TabsTrigger value="expenses">Gastos</TabsTrigger>
            <TabsTrigger value="report">Relatório</TabsTrigger>
          </TabsList>

          <TabsContent value="offerings" className="space-y-4">
            <OfferingsManagement />
          </TabsContent>

          <TabsContent value="tithes" className="space-y-4">
            <TithesManagement />
          </TabsContent>

          <TabsContent value="expenses" className="space-y-4">
            <ExpensesManagement />
          </TabsContent>

          <TabsContent value="report" className="space-y-4">
            <p className="text-center text-muted-foreground py-8">
              Funcionalidade de relatórios será implementada em breve
            </p>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Tesouraria;
