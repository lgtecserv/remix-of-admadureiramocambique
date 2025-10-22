import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import AppLayout from "@/components/layout/AppLayout";
import { CreatePastorForm } from "@/components/admin/CreatePastorForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield } from "lucide-react";

interface Pastor {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
}

const SuperAdmin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pastors, setPastors] = useState<Pastor[]>([]);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    checkSuperAdmin();
  }, []);

  const checkSuperAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", session.user.id)
      .single();

    if (!profile || profile.email !== "lgtecserv@gmail.com") {
      navigate("/dashboard");
      return;
    }

    setUserEmail(profile.email);
    loadPastors();
    setLoading(false);
  };

  const loadPastors = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select(`
        id,
        user_id,
        created_at,
        profiles!inner(full_name, email)
      `)
      .eq("role", "pastor");

    if (data) {
      const pastorsList = data.map((item: any) => ({
        id: item.user_id,
        full_name: item.profiles.full_name,
        email: item.profiles.email,
        created_at: item.created_at,
      }));
      setPastors(pastorsList);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout userName="Super Admin" role="super-admin">
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Painel Super Admin</h1>
            <p className="text-muted-foreground">{userEmail}</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <CreatePastorForm onSuccess={loadPastors} />

          <Card>
            <CardHeader>
              <CardTitle>Pastores Cadastrados</CardTitle>
            </CardHeader>
            <CardContent>
              {pastors.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Nenhum pastor cadastrado ainda
                </p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pastors.map((pastor) => (
                        <TableRow key={pastor.id}>
                          <TableCell className="font-medium">{pastor.full_name}</TableCell>
                          <TableCell>{pastor.email}</TableCell>
                          <TableCell>
                            <Badge variant="default">Pastor</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default SuperAdmin;