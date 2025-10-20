import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, getDepartmentLabel } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const Settings = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ full_name: string } | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [department, setDepartment] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);

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

      if (roleData) {
        setRole(roleData.role);
        setDepartment(roleData.department);
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", session.user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        setFullName(profileData.full_name);
      }

      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", user.id);

    if (error) {
      toast.error("Erro ao salvar perfil");
    } else {
      toast.success("Perfil atualizado com sucesso");
      setProfile({ full_name: fullName });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout userName={profile?.full_name} role={role || undefined}>
      <div className="space-y-8 max-w-2xl animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground">Gerencie suas informações pessoais</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
            <CardDescription>Atualize suas informações pessoais</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user?.email || ""} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome Completo</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar Alterações
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Informações da Conta</CardTitle>
            <CardDescription>Detalhes sobre seu acesso ao sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <Label className="text-sm font-medium">Função</Label>
                <p className="text-sm text-muted-foreground">Seu nível de acesso</p>
              </div>
              <Badge variant={role === "pastor" ? "default" : "secondary"} className="text-sm">
                {role === "pastor" ? "Pastor" : "Líder"}
              </Badge>
            </div>
            
            {role === "leader" && department && (
              <div className="flex items-center justify-between py-2 border-t">
                <div>
                  <Label className="text-sm font-medium">Departamento</Label>
                  <p className="text-sm text-muted-foreground">Área de responsabilidade</p>
                </div>
                <Badge variant="outline" className="text-sm">
                  {getDepartmentLabel(department)}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Settings;
