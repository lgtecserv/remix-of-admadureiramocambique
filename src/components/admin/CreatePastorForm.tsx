import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";

const pastorSchema = z.object({
  email: z.string().trim().email({ message: "Email inválido" }).max(255, { message: "Email muito longo" }),
  password: z.string().min(6, { message: "Senha deve ter no mínimo 6 caracteres" }).max(72, { message: "Senha muito longa" }),
  fullName: z.string().trim().min(1, { message: "Nome não pode estar vazio" }).max(100, { message: "Nome muito longo" }),
});

interface CreatePastorFormProps {
  onSuccess: () => void;
}

export function CreatePastorForm({ onSuccess }: CreatePastorFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input
      const validatedData = pastorSchema.parse(formData);

      const { error } = await supabase.functions.invoke("create-pastor", {
        body: validatedData,
      });

      if (error) throw error;

      toast.success("Pastor criado com sucesso!");
      setFormData({ email: "", password: "", fullName: "" });
      onSuccess();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          toast.error(err.message);
        });
      } else {
        console.error("Error creating pastor:", error);
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
        <CardDescription>
          Cadastre um novo pastor que terá acesso completo ao sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="fullName">Nome Completo *</Label>
            <Input
              id="fullName"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="Nome do pastor"
              required
              maxLength={100}
            />
          </div>

          <div>
            <Label htmlFor="email">E-mail *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@exemplo.com"
              required
              maxLength={255}
            />
          </div>

          <div>
            <Label htmlFor="password">Senha *</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
              maxLength={72}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando...
              </>
            ) : (
              "Criar Pastor"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}