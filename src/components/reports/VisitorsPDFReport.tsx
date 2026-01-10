import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";
import {
  createPDFDocument,
  addSectionTitle,
  addTable,
  addSummaryBox,
  addFooter,
  downloadPDF,
  formatDateBR,
} from "@/lib/pdfGenerator";

interface VisitorsPDFReportProps {
  role: string;
  department?: string;
}

const DEPARTMENTS = [
  { value: "all", label: "Todos os Departamentos" },
  { value: "jovens", label: "Jovens" },
  { value: "senhoras", label: "Senhoras" },
  { value: "varoes", label: "Varões" },
  { value: "criancas", label: "Crianças" },
  { value: "adolescentes", label: "Adolescentes" },
];

const PERIODS = [
  { value: "month", label: "Este Mês" },
  { value: "3months", label: "Últimos 3 Meses" },
  { value: "6months", label: "Últimos 6 Meses" },
  { value: "year", label: "Este Ano" },
  { value: "all", label: "Todos" },
];

const RETURN_STATUS = [
  { value: "all", label: "Todos" },
  { value: "returned", label: "Retornaram" },
  { value: "not_returned", label: "Não Retornaram" },
];

const VisitorsPDFReport = ({ role, department }: VisitorsPDFReportProps) => {
  const [selectedDepartment, setSelectedDepartment] = useState<string>(department || "all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("month");
  const [selectedReturn, setSelectedReturn] = useState<string>("all");
  const [loading, setLoading] = useState(false);

  const getDateRange = () => {
    const now = new Date();
    switch (selectedPeriod) {
      case "month":
        return { from: startOfMonth(now), to: endOfMonth(now) };
      case "3months":
        return { from: startOfMonth(subMonths(now, 2)), to: endOfMonth(now) };
      case "6months":
        return { from: startOfMonth(subMonths(now, 5)), to: endOfMonth(now) };
      case "year":
        return { from: new Date(now.getFullYear(), 0, 1), to: new Date(now.getFullYear(), 11, 31) };
      default:
        return null;
    }
  };

  const generatePDF = async () => {
    setLoading(true);

    try {
      let query = supabase.from("visitors").select("*").order("visit_date", { ascending: false });

      // Filter by department
      if (role === "leader" && department) {
        query = query.eq("department", department as any);
      } else if (selectedDepartment !== "all") {
        query = query.eq("department", selectedDepartment as any);
      }

      // Filter by period
      const dateRange = getDateRange();
      if (dateRange) {
        query = query
          .gte("visit_date", dateRange.from.toISOString().split("T")[0])
          .lte("visit_date", dateRange.to.toISOString().split("T")[0]);
      }

      // Filter by return status
      if (selectedReturn === "returned") {
        query = query.eq("returned", true);
      } else if (selectedReturn === "not_returned") {
        query = query.eq("returned", false);
      }

      const { data: visitors, error } = await query;

      if (error) throw error;

      if (!visitors || visitors.length === 0) {
        toast.error("Nenhum visitante encontrado com os filtros selecionados");
        setLoading(false);
        return;
      }

      // Create PDF
      const doc = createPDFDocument({
        title: "Relatório de Visitantes",
        dateRange: dateRange || undefined,
      });

      let yPos = 50;

      // Summary section
      const returnedCount = visitors.filter(v => v.returned).length;
      const notReturnedCount = visitors.filter(v => !v.returned).length;

      yPos = addSummaryBox(doc, [
        { label: "Total de Visitantes", value: String(visitors.length) },
        { label: "Retornaram", value: String(returnedCount), color: "success" },
        { label: "Não Retornaram", value: String(notReturnedCount), color: "danger" },
        { label: "Taxa de Retorno", value: `${((returnedCount / visitors.length) * 100).toFixed(1)}%` },
      ], yPos);

      // Visitors table
      yPos = addSectionTitle(doc, "Lista de Visitantes", yPos);

      const tableData = visitors.map(visitor => ({
        nome: visitor.full_name,
        telefone: visitor.phone_number || "-",
        dataVisita: formatDateBR(visitor.visit_date),
        convidadoPor: visitor.invited_by || "-",
        retornou: visitor.returned ? "Sim" : "Não",
        departamento: visitor.department || "-",
      }));

      addTable(doc, [
        { header: "Nome", key: "nome", width: 45 },
        { header: "Telefone", key: "telefone", width: 28 },
        { header: "Data Visita", key: "dataVisita", width: 25, align: "center" },
        { header: "Convidado Por", key: "convidadoPor", width: 35 },
        { header: "Retornou", key: "retornou", width: 20, align: "center" },
        { header: "Depto", key: "departamento", width: 27 },
      ], tableData, yPos);

      addFooter(doc);
      downloadPDF(doc, "relatorio-visitantes");
      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erro ao gerar o PDF");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-5 w-5 text-primary" />
          Relatório de Visitantes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {role !== "leader" && (
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger>
                <SelectValue placeholder="Departamento" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map(dept => (
                  <SelectItem key={dept.value} value={dept.value}>
                    {dept.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger>
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map(period => (
                <SelectItem key={period.value} value={period.value}>
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedReturn} onValueChange={setSelectedReturn}>
            <SelectTrigger>
              <SelectValue placeholder="Retorno" />
            </SelectTrigger>
            <SelectContent>
              {RETURN_STATUS.map(status => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={generatePDF} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Gerando PDF...
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              Gerar PDF de Visitantes
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default VisitorsPDFReport;
