import { useState } from "react";
import { supabase, getDepartmentLabel } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { z } from "zod";

const leaderSchema = z.object({
  fullName: z.string()
    .trim()
    .min(1, "Nome é obrigatório")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  email: z.string()
    .trim()
    .email("Email inválido")
    .max(255, "Email deve ter no máximo 255 caracteres"),
  password: z.string()
    .min(6, "Senha deve ter no mínimo 6 caracteres")
    .max(72, "Senha deve ter no máximo 72 caracteres"),
  department: z.string().min(1, "Departamento é obrigatório"),
});

interface CreateLeaderFormProps {
  onSuccess: () => void;
}

const departments = ["jovens", "irmas", "varoes", "adolescentes", "criancas"];

const CreateLeaderForm = ({ onSuccess }: CreateLeaderFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    department: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input
      const validatedData = leaderSchema.parse(formData);

      // Call backend function to create leader (doesn't affect current session)
      const { data, error } = await supabase.functions.invoke("create-leader", {
        body: {
          email: validatedData.email,
          password: validatedData.password,
          fullName: validatedData.fullName,
          department: validatedData.department,
        },
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || "Erro ao cadastrar líder");
      }

      toast.success("Líder cadastrado com sucesso!");
      setFormData({ fullName: "", email: "", password: "", department: "" });
      onSuccess();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error("Error creating leader:", error);
        toast.error(error.message || "Erro ao cadastrar líder");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Nome Completo</Label>
        <Input
          id="fullName"
          type="text"
          value={formData.fullName}
          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
          maxLength={100}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          maxLength={255}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          minLength={6}
          maxLength={72}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="department">Departamento</Label>
        <Select
          value={formData.department}
          onValueChange={(value) => setFormData({ ...formData, department: value })}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o departamento" />
          </SelectTrigger>
          <SelectContent>
            {departments.map((dept) => (
              <SelectItem key={dept} value={dept}>
                {getDepartmentLabel(dept)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Cadastrando..." : "Cadastrar Líder"}
      </Button>
    </form>
  );
};

export default CreateLeaderForm;
