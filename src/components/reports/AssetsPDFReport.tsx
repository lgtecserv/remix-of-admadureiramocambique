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

interface AssetsPDFReportProps {
  role: string;
}

const CONDITIONS = [
  { value: "all", label: "Todas as Condições" },
  { value: "perfeito", label: "Perfeito" },
  { value: "bom", label: "Bom" },
  { value: "regular", label: "Regular" },
  { value: "danificado", label: "Danificado" },
];

const AssetsPDFReport = ({ role }: AssetsPDFReportProps) => {
  const [selectedCondition, setSelectedCondition] = useState<string>("all");
  const [loading, setLoading] = useState(false);

  const generatePDF = async () => {
    setLoading(true);

    try {
      let query = supabase.from("church_assets").select("*").order("name");

      // Filter by condition
      if (selectedCondition !== "all") {
        query = query.eq("condition", selectedCondition);
      }

      const { data: assets, error } = await query;

      if (error) throw error;

      if (!assets || assets.length === 0) {
        toast.error("Nenhum item encontrado com os filtros selecionados");
        setLoading(false);
        return;
      }

      // Create PDF
      const doc = createPDFDocument({
        title: "Inventário de Patrimônio",
      });

      let yPos = 50;

      // Summary section
      const totalQuantity = assets.reduce((sum, a) => sum + (a.quantity || 0), 0);
      const conditionCounts = {
        perfeito: assets.filter(a => a.condition === "perfeito").length,
        bom: assets.filter(a => a.condition === "bom").length,
        regular: assets.filter(a => a.condition === "regular").length,
        danificado: assets.filter(a => a.condition === "danificado").length,
      };

      yPos = addSummaryBox(doc, [
        { label: "Total de Tipos de Itens", value: String(assets.length) },
        { label: "Quantidade Total", value: String(totalQuantity) },
        { label: "Em Perfeito Estado", value: String(conditionCounts.perfeito), color: "success" },
        { label: "Danificados", value: String(conditionCounts.danificado), color: "danger" },
      ], yPos);

      // Assets table
      yPos = addSectionTitle(doc, "Lista de Patrimônio", yPos);

      const tableData = assets.map(asset => ({
        nome: asset.name,
        quantidade: String(asset.quantity || 0),
        condicao: asset.condition || "-",
        observacoes: asset.observations || "-",
        cadastro: asset.created_at ? formatDateBR(asset.created_at) : "-",
      }));

      addTable(doc, [
        { header: "Nome do Item", key: "nome", width: 55 },
        { header: "Qtd", key: "quantidade", width: 20, align: "center" },
        { header: "Condição", key: "condicao", width: 30, align: "center" },
        { header: "Observações", key: "observacoes", width: 50 },
        { header: "Cadastro", key: "cadastro", width: 25, align: "center" },
      ], tableData, yPos);

      addFooter(doc);
      downloadPDF(doc, "inventario-patrimonio");
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
          Inventário de Patrimônio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={selectedCondition} onValueChange={setSelectedCondition}>
          <SelectTrigger>
            <SelectValue placeholder="Condição" />
          </SelectTrigger>
          <SelectContent>
            {CONDITIONS.map(condition => (
              <SelectItem key={condition.value} value={condition.value}>
                {condition.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={generatePDF} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Gerando PDF...
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              Gerar PDF de Patrimônio
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AssetsPDFReport;
