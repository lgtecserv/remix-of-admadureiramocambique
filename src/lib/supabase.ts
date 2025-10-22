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

export const getDepartmentColor = (department: string): string => {
  const colors: Record<string, string> = {
    jovens: "hsl(221, 83%, 53%)",      // Azul
    irmas: "hsl(346, 77%, 50%)",       // Rosa
    varoes: "hsl(280, 67%, 55%)",      // Roxo
    adolescentes: "hsl(45, 93%, 47%)", // Amarelo
    criancas: "hsl(142, 76%, 36%)"     // Verde
  };
  return colors[department] || "hsl(240, 5%, 64%)";
};

export const getDepartmentBadgeClass = (department: string): string => {
  const classes: Record<string, string> = {
    jovens: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    irmas: "bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20",
    varoes: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
    adolescentes: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
    criancas: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
  };
  return classes[department] || "bg-gray-500/10 text-gray-700 dark:text-gray-400";
};

export { supabase };
