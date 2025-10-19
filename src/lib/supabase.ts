import { supabase } from "@/integrations/supabase/client";

export const getDepartmentLabel = (department: string): string => {
  const labels: Record<string, string> = {
    jovens: "Jovens",
    irmas: "Irmãs",
    varoes: "Varões",
    adolescentes: "Adolescentes",
    criancas: "Crianças"
  };
  return labels[department] || department;
};

export const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    novo: "Novo",
    ativo: "Ativo",
    inativo: "Inativo"
  };
  return labels[status] || status;
};

export { supabase };
