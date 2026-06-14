import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { format } from "date-fns";
import { useSelectedCongregation } from "@/contexts/SelectedCongregationContext";

interface ExportDataProps {
  role: string;
  department?: string;
}

const ExportData = ({ role, department }: ExportDataProps) => {
  const { getEffectiveCongregationId } = useSelectedCongregation();
  
  const exportToCSV = (data: any[], filename: string, headers: string[]) => {
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers.map((header) => {
          const value = row[header] || "";
          return typeof value === "string" && value.includes(",") ? `"${value}"` : value;
        }).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  const exportMembers = async () => {
    try {
      const congId = getEffectiveCongregationId();
      let query = supabase.from("members").select("*");
      
      if (congId) {
        query = query.eq("congregation_id", congId);
      }

      if (role === "leader" && department) {
        query = query.eq("department", department as any);
      }

      const { data, error } = await query;
      if (error) throw error;

      const headers = ["full_name", "phone_number", "department", "status", "address", "occupation", "created_at"];
      exportToCSV(data || [], "membros", headers);
      toast.success("Membros exportados com sucesso!");
    } catch (error) {
      console.error("Error exporting members:", error);
      toast.error("Erro ao exportar membros");
    }
  };

  const exportAttendances = async () => {
    try {
      let query = supabase.from("attendances").select(`
        event_date,
        event_type,
        department,
        notes,
        members(full_name)
      `);
      
      const congId = getEffectiveCongregationId();
      if (congId) {
        query = query.eq("congregation_id", congId);
      }

      if (role === "leader" && department) {
        query = query.eq("department", department as any);
      }

      const { data, error } = await query;
      if (error) throw error;

      const formatted = (data || []).map((item: any) => ({
        data: item.event_date,
        tipo: item.event_type,
        pessoa: item.members?.full_name || "",
        departamento: item.department,
        observacoes: item.notes || "",
      }));

      const headers = ["data", "tipo", "pessoa", "departamento", "observacoes"];
      exportToCSV(formatted, "presencas", headers);
      toast.success("Presenças exportadas com sucesso!");
    } catch (error) {
      console.error("Error exporting attendances:", error);
      toast.error("Erro ao exportar presenças");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileSpreadsheet className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Exportar Dados</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button onClick={exportMembers} variant="outline" className="h-24 flex-col gap-2">
          <Download className="h-6 w-6" />
          <span>Exportar Membros</span>
        </Button>

        <Button onClick={exportAttendances} variant="outline" className="h-24 flex-col gap-2">
          <Download className="h-6 w-6" />
          <span>Exportar Presenças</span>
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Os arquivos serão exportados em formato CSV, compatível com Excel e Google Sheets.
      </p>
    </div>
  );
};

export default ExportData;
