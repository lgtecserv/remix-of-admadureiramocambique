import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  createPDFDocument,
  addSectionTitle,
  addTable,
  addSummaryBox,
  addFooter,
  downloadPDF,
  formatDateBR,
} from "@/lib/pdfGenerator";

interface MembersPDFReportProps {
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

const STATUSES = [
  { value: "all", label: "Todos os Status" },
  { value: "ativo", label: "Ativo" },
  { value: "inativo", label: "Inativo" },
  { value: "novo", label: "Novo" },
  { value: "transferido", label: "Transferido" },
  { value: "desligado", label: "Desligado" },
  { value: "falecido", label: "Falecido" },
];

const MembersPDFReport = ({ role, department }: MembersPDFReportProps) => {
  const [selectedDepartment, setSelectedDepartment] = useState<string>(department || "all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [loading, setLoading] = useState(false);

  const generatePDF = async () => {
    setLoading(true);

    try {
      let query = supabase.from("members").select("*").order("full_name");

      // Filter by department
      if (role === "leader" && department) {
        query = query.eq("department", department as any);
      } else if (selectedDepartment !== "all") {
        query = query.eq("department", selectedDepartment as any);
      }

      // Filter by status
      if (selectedStatus !== "all") {
        query = query.eq("status", selectedStatus as any);
      }

      const { data: members, error } = await query;

      if (error) throw error;

      if (!members || members.length === 0) {
        toast.error("Nenhum membro encontrado com os filtros selecionados");
        setLoading(false);
        return;
      }

      // Create PDF
      const doc = createPDFDocument({
        title: "Relatório de Membros",
        subtitle: selectedDepartment !== "all" ? `Departamento: ${selectedDepartment}` : undefined,
      });

      let yPos = 50;

      // Summary section
      const statusCounts = {
        ativo: members.filter(m => m.status === "ativo").length,
        inativo: members.filter(m => m.status === "inativo").length,
        novo: members.filter(m => m.status === "novo").length,
        outros: members.filter(m => !["ativo", "inativo", "novo"].includes(m.status)).length,
      };

      yPos = addSummaryBox(doc, [
        { label: "Total de Membros", value: String(members.length) },
        { label: "Ativos", value: String(statusCounts.ativo), color: "success" },
        { label: "Inativos", value: String(statusCounts.inativo), color: "danger" },
        { label: "Novos", value: String(statusCounts.novo) },
      ], yPos);

      // Members table
      yPos = addSectionTitle(doc, "Lista de Membros", yPos);

      const tableData = members.map(member => ({
        nome: member.full_name,
        telefone: member.phone_number || "-",
        departamento: member.department || "-",
        status: member.status || "-",
        tipo: member.member_type || "Membro",
        cadastro: member.created_at ? formatDateBR(member.created_at) : "-",
      }));

      addTable(doc, [
        { header: "Nome", key: "nome", width: 50 },
        { header: "Telefone", key: "telefone", width: 30 },
        { header: "Depto", key: "departamento", width: 25 },
        { header: "Status", key: "status", width: 22 },
        { header: "Tipo", key: "tipo", width: 25 },
        { header: "Cadastro", key: "cadastro", width: 28, align: "center" },
      ], tableData, yPos);

      addFooter(doc);
      downloadPDF(doc, "relatorio-membros");
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
          Relatório de Membros
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map(status => (
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
              Gerar PDF de Membros
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default MembersPDFReport;
