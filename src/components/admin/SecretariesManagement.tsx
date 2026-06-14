import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ShieldCheck, Plus, Trash2, Loader2 } from "lucide-react";

interface Secretary {
  user_id: string;
  full_name: string;
  email: string;
}

export function SecretariesManagement() {
  const [list, setList] = useState<Secretary[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });

  const load = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("user_id, profiles!inner(full_name, email)")
      .eq("role", "secretary" as any);
    if (data) {
      setList(
        data.map((r: any) => ({
          user_id: r.user_id,
          full_name: r.profiles.full_name,
          email: r.profiles.email,
        }))
      );
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim() || !form.email.trim() || form.password.length < 6) {
      toast.error("Preencha nome, e-mail e senha (mínimo 6 caracteres)");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-secretary", {
        body: { fullName: form.fullName.trim(), email: form.email.trim(), password: form.password },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao criar secretário");
      toast.success("Secretário criado!");
      setForm({ fullName: "", email: "", password: "" });
      setOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar secretário");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (userId: string) => {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", "secretary" as any);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Acesso de secretário removido");
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> Secretários
          </CardTitle>
          <CardDescription>Gestão total do sistema (criar, editar, apagar, aprovar)</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Novo</Button>
          </DialogTrigger>
          <DialogContent className="w-[calc(100%-2rem)] max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Secretário</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <Label htmlFor="sec-name">Nome Completo *</Label>
                <Input id="sec-name" value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })} required maxLength={100} />
              </div>
              <div>
                <Label htmlFor="sec-email">E-mail *</Label>
                <Input id="sec-email" type="email" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} required maxLength={255} />
              </div>
              <div>
                <Label htmlFor="sec-pwd">Senha *</Label>
                <Input id="sec-pwd" type="password" value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} maxLength={72} />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Criando...</>) : "Criar Secretário"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum secretário cadastrado.
          </p>
        ) : (
          <div className="space-y-2">
            {list.map((s) => (
              <div key={s.user_id} className="flex items-center justify-between gap-2 p-3 rounded-md border bg-card">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium truncate">{s.full_name}</p>
                    <Badge className="text-xs">Secretário</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="destructive" className="h-8 w-8 shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover acesso de secretário?</AlertDialogTitle>
                      <AlertDialogDescription>
                        O usuário continuará existindo, mas perderá a função de secretário.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleRemove(s.user_id)}>Remover</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
