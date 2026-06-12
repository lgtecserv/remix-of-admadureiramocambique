import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";

const pastorSchema = z.object({
  email: z.string().trim().email({ message: "Email inválido" }).max(255),
  password: z.string().min(6, { message: "Senha deve ter no mínimo 6 caracteres" }).max(72),
  fullName: z.string().trim().min(1, { message: "Nome não pode estar vazio" }).max(100),
  congregationId: z.string().uuid({ message: "Selecione uma congregação" }),
  isTitular: z.boolean().optional(),
});

interface Congregation {
  id: string;
  name: string;
}

interface CreatePastorFormProps {
  onSuccess: () => void;
}

export function CreatePastorForm({ onSuccess }: CreatePastorFormProps) {
  const [loading, setLoading] = useState(false);
  const [congregations, setCongregations] = useState<Congregation[]>([]);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    congregationId: "",
    isTitular: true,
  });

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("congregations")
        .select("id, name")
        .eq("active", true)
        .order("name");
      if (data) setCongregations(data);
    };
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const validatedData = pastorSchema.parse(formData);
      const { error } = await supabase.functions.invoke("create-pastor", {
        body: validatedData,
      });
      if (error) throw error;
      toast.success("Pastor criado com sucesso!");
      setFormData({ email: "", password: "", fullName: "", congregationId: "", isTitular: true });
      onSuccess();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => toast.error(err.message));
      } else {
        console.error(error);
        toast.error(error.message || "Erro ao criar pastor");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar Novo Pastor</CardTitle>
        <CardDescription>Vincule o pastor a uma congregação</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="fullName">Nome Completo *</Label>
            <Input id="fullName" value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              required maxLength={100} />
          </div>

          <div>
            <Label htmlFor="email">E-mail *</Label>
            <Input id="email" type="email" value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required maxLength={255} />
          </div>

          <div>
            <Label htmlFor="password">Senha *</Label>
            <Input id="password" type="password" value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required minLength={6} maxLength={72} />
          </div>

          <div>
            <Label>Congregação *</Label>
            <Select value={formData.congregationId}
              onValueChange={(v) => setFormData({ ...formData, congregationId: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma congregação" />
              </SelectTrigger>
              <SelectContent>
                {congregations.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {congregations.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Cadastre uma congregação primeiro.
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="isTitular" checked={formData.isTitular}
              onCheckedChange={(v) => setFormData({ ...formData, isTitular: !!v })} />
            <Label htmlFor="isTitular" className="cursor-pointer">Pastor titular da congregação</Label>
          </div>

          <Button type="submit" disabled={loading || congregations.length === 0} className="w-full">
            {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando...</>) : "Criar Pastor"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
