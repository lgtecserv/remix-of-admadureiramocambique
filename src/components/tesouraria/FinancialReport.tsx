import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";
import { DateRangeFilter } from "@/components/common/DateRangeFilter";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import jsPDF from "jspdf";

// Local helper functions
const formatCurrency = (value: number) => new Intl.NumberFormat("pt-MZ", { style: "currency", currency: "MZN" }).format(value);
const formatDate = (date: Date) => format(date, "dd/MM/yyyy");

const addPDFHeader = (doc: jsPDF, title: string): number => {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, pageWidth, 25, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("AD Madureira Moçambique", 14, 12);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(title, 14, 20);
  return 35;
};

const addPDFFooter = (doc: jsPDF, pageNum: number) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, pageHeight - 10);
  doc.text(`Página ${pageNum}`, pageWidth - 25, pageHeight - 10);
};

interface FinancialSummary {
  totalOfferings: number;
  totalTithes: number;
  totalExpenses: number;
  totalAdjustments: number;
  balance: number;
}

interface OfferingRecord {
  id: string;
  amount: number;
  event_date: string;
  event_type: string;
  notes: string | null;
}

interface TitheRecord {
  id: string;
  amount: number;
  tithe_date: string;
  tithe_month: number;
  member: { full_name: string } | null;
}

interface ExpenseRecord {
  id: string;
  amount: number;
  expense_date: string;
  description: string;
  category: string;
}

interface OfferingByType {
  type: string;
  total: number;
}

interface ExpenseByCategory {
  category: string;
  total: number;
}

interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
}

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

const EVENT_TYPE_NAMES: Record<string, string> = {
  culto_domingo: "Culto de Domingo",
  culto_quarta: "Culto de Quarta",
  culto_especial: "Culto Especial",
  campanha: "Campanha",
  outro: "Outro",
};

const CATEGORY_NAMES: Record<string, string> = {
  manutencao: "Manutenção",
  utilidades: "Utilidades",
  materiais: "Materiais",
  eventos: "Eventos",
  salarios: "Salários",
  outros: "Outros",
};

export const FinancialReport = () => {
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [summary, setSummary] = useState<FinancialSummary>({
    totalOfferings: 0,
    totalTithes: 0,
    totalExpenses: 0,
    totalAdjustments: 0,
    balance: 0,
  });
  const [offerings, setOfferings] = useState<OfferingRecord[]>([]);
  const [tithes, setTithes] = useState<TitheRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [offeringsByType, setOfferingsByType] = useState<OfferingByType[]>([]);
  const [expensesByCategory, setExpensesByCategory] = useState<ExpenseByCategory[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);

  const loadReport = async () => {
    setLoading(true);
    const startStr = format(startDate, "yyyy-MM-dd");
    const endStr = format(endDate, "yyyy-MM-dd");

    try {
      const [offeringsRes, tithesRes, expensesRes, adjustmentsRes] = await Promise.all([
        supabase
          .from("offerings")
          .select("*")
          .gte("event_date", startStr)
          .lte("event_date", endStr)
          .order("event_date", { ascending: false }),
        supabase
          .from("tithes")
          .select("*, member:members(full_name)")
          .gte("tithe_date", startStr)
          .lte("tithe_date", endStr)
          .order("tithe_date", { ascending: false }),
        supabase
          .from("expenses")
          .select("*")
          .gte("expense_date", startStr)
          .lte("expense_date", endStr)
          .order("expense_date", { ascending: false }),
        supabase
          .from("balance_adjustments")
          .select("*")
          .gte("adjustment_date", startStr)
          .lte("adjustment_date", endStr),
      ]);

      const offeringsData = offeringsRes.data || [];
      const tithesData = tithesRes.data || [];
      const expensesData = expensesRes.data || [];
      const adjustmentsData = adjustmentsRes.data || [];

      setOfferings(offeringsData);
      setTithes(tithesData as TitheRecord[]);
      setExpenses(expensesData);

      // Calculate summary
      const totalOfferings = offeringsData.reduce((sum, o) => sum + Number(o.amount), 0);
      const totalTithes = tithesData.reduce((sum, t) => sum + Number(t.amount), 0);
      const totalExpenses = expensesData.reduce((sum, e) => sum + Number(e.amount), 0);
      const totalAdjustments = adjustmentsData.reduce((sum, a) => sum + Number(a.amount), 0);

      setSummary({
        totalOfferings,
        totalTithes,
        totalExpenses,
        totalAdjustments,
        balance: totalOfferings + totalTithes + totalAdjustments - totalExpenses,
      });

      // Group offerings by type
      const offeringGroups: Record<string, number> = {};
      offeringsData.forEach((o) => {
        offeringGroups[o.event_type] = (offeringGroups[o.event_type] || 0) + Number(o.amount);
      });
      setOfferingsByType(
        Object.entries(offeringGroups).map(([type, total]) => ({ type, total }))
      );

      // Group expenses by category
      const expenseGroups: Record<string, number> = {};
      expensesData.forEach((e) => {
        expenseGroups[e.category] = (expenseGroups[e.category] || 0) + Number(e.amount);
      });
      setExpensesByCategory(
        Object.entries(expenseGroups).map(([category, total]) => ({ category, total }))
      );

      // Monthly data for chart
      const monthlyGroups: Record<string, { income: number; expenses: number }> = {};
      [...offeringsData, ...tithesData].forEach((item: any) => {
        const date = item.event_date || item.tithe_date;
        const month = date.substring(0, 7);
        if (!monthlyGroups[month]) monthlyGroups[month] = { income: 0, expenses: 0 };
        monthlyGroups[month].income += Number(item.amount);
      });
      expensesData.forEach((e) => {
        const month = e.expense_date.substring(0, 7);
        if (!monthlyGroups[month]) monthlyGroups[month] = { income: 0, expenses: 0 };
        monthlyGroups[month].expenses += Number(e.amount);
      });

      const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      setMonthlyData(
        Object.entries(monthlyGroups)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([monthStr, data]) => {
            const [year, month] = monthStr.split("-");
            return {
              month: `${monthNames[parseInt(month) - 1]}/${year.slice(2)}`,
              income: data.income,
              expenses: data.expenses,
            };
          })
      );
    } catch (error) {
      console.error("Erro ao carregar relatório:", error);
      toast.error("Erro ao carregar dados do relatório");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [startDate, endDate]);

  const getEventTypeName = (type: string) => EVENT_TYPE_NAMES[type] || type;
  const getCategoryName = (category: string) => CATEGORY_NAMES[category] || category;

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
      : { r: 0, g: 0, b: 0 };
  };

  const exportPDF = async () => {
    setGenerating(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;
      let y = 20;

      // Header
      y = addPDFHeader(doc, "Relatório Financeiro Detalhado");

      // Period
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Período: ${formatDate(startDate)} a ${formatDate(endDate)}`, margin, y);
      y += 12;

      // Summary Section
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text("Resumo Financeiro", margin, y);
      y += 10;

      const boxWidth = (pageWidth - margin * 2 - 10) / 2;
      const boxHeight = 20;

      // Offerings box
      doc.setFillColor(34, 197, 94);
      doc.rect(margin, y, boxWidth, boxHeight, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("OFERTAS", margin + 4, y + 7);
      doc.setFontSize(11);
      doc.text(formatCurrency(summary.totalOfferings), margin + 4, y + 16);

      // Tithes box
      doc.setFillColor(59, 130, 246);
      doc.rect(margin + boxWidth + 10, y, boxWidth, boxHeight, "F");
      doc.setFontSize(9);
      doc.text("DÍZIMOS", margin + boxWidth + 14, y + 7);
      doc.setFontSize(11);
      doc.text(formatCurrency(summary.totalTithes), margin + boxWidth + 14, y + 16);

      y += boxHeight + 5;

      // Expenses box
      doc.setFillColor(239, 68, 68);
      doc.rect(margin, y, boxWidth, boxHeight, "F");
      doc.setFontSize(9);
      doc.text("DESPESAS", margin + 4, y + 7);
      doc.setFontSize(11);
      doc.text(formatCurrency(summary.totalExpenses), margin + 4, y + 16);

      // Balance box
      const isPositive = summary.balance >= 0;
      doc.setFillColor(isPositive ? 34 : 239, isPositive ? 197 : 68, isPositive ? 94 : 68);
      doc.rect(margin + boxWidth + 10, y, boxWidth, boxHeight, "F");
      doc.setFontSize(9);
      doc.text("SALDO DO PERÍODO", margin + boxWidth + 14, y + 7);
      doc.setFontSize(11);
      doc.text(formatCurrency(summary.balance), margin + boxWidth + 14, y + 16);

      y += boxHeight + 15;

      // Offerings by Type
      if (offeringsByType.length > 0) {
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Ofertas por Tipo de Evento", margin, y);
        y += 8;

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        offeringsByType.forEach((item, index) => {
          const color = COLORS[index % COLORS.length];
          const rgb = hexToRgb(color);
          doc.setFillColor(rgb.r, rgb.g, rgb.b);
          doc.rect(margin, y - 3, 4, 4, "F");
          doc.setTextColor(0, 0, 0);
          doc.text(`${getEventTypeName(item.type)}: ${formatCurrency(item.total)}`, margin + 8, y);
          y += 6;
        });
        y += 5;
      }

      // Expenses by Category
      if (expensesByCategory.length > 0) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Despesas por Categoria", margin, y);
        y += 8;

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        expensesByCategory.forEach((item, index) => {
          const color = COLORS[index % COLORS.length];
          const rgb = hexToRgb(color);
          doc.setFillColor(rgb.r, rgb.g, rgb.b);
          doc.rect(margin, y - 3, 4, 4, "F");
          doc.setTextColor(0, 0, 0);
          doc.text(`${getCategoryName(item.category)}: ${formatCurrency(item.total)}`, margin + 8, y);
          y += 6;
        });
        y += 10;
      }

      // Detailed Offerings Table
      if (offerings.length > 0) {
        if (y > 220) {
          addPDFFooter(doc, doc.internal.pages.length);
          doc.addPage();
          y = 20;
        }

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text("Detalhamento de Ofertas", margin, y);
        y += 8;

        // Table header
        doc.setFillColor(34, 197, 94);
        doc.rect(margin, y - 4, pageWidth - margin * 2, 8, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text("Data", margin + 2, y);
        doc.text("Tipo de Evento", margin + 30, y);
        doc.text("Valor", pageWidth - margin - 20, y);
        y += 6;

        doc.setTextColor(0, 0, 0);
        offerings.slice(0, 12).forEach((offering, index) => {
          if (index % 2 === 0) {
            doc.setFillColor(245, 245, 245);
            doc.rect(margin, y - 4, pageWidth - margin * 2, 6, "F");
          }
          doc.text(formatDate(new Date(offering.event_date)), margin + 2, y);
          doc.text(getEventTypeName(offering.event_type), margin + 30, y);
          doc.text(formatCurrency(offering.amount), pageWidth - margin - 20, y);
          y += 6;
        });

        if (offerings.length > 12) {
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text(`... e mais ${offerings.length - 12} registros`, margin, y + 2);
        }
        y += 12;
      }

      // Detailed Tithes Table
      if (tithes.length > 0) {
        if (y > 200) {
          addPDFFooter(doc, doc.internal.pages.length);
          doc.addPage();
          y = 20;
        }

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text("Detalhamento de Dízimos", margin, y);
        y += 8;

        doc.setFillColor(59, 130, 246);
        doc.rect(margin, y - 4, pageWidth - margin * 2, 8, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text("Data", margin + 2, y);
        doc.text("Membro", margin + 30, y);
        doc.text("Valor", pageWidth - margin - 20, y);
        y += 6;

        doc.setTextColor(0, 0, 0);
        tithes.slice(0, 12).forEach((tithe, index) => {
          if (index % 2 === 0) {
            doc.setFillColor(245, 245, 245);
            doc.rect(margin, y - 4, pageWidth - margin * 2, 6, "F");
          }
          doc.text(formatDate(new Date(tithe.tithe_date)), margin + 2, y);
          const memberName = tithe.member?.full_name || "Não identificado";
          doc.text(memberName.substring(0, 40), margin + 30, y);
          doc.text(formatCurrency(tithe.amount), pageWidth - margin - 20, y);
          y += 6;
        });

        if (tithes.length > 12) {
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text(`... e mais ${tithes.length - 12} registros`, margin, y + 2);
        }
        y += 12;
      }

      // Detailed Expenses Table
      if (expenses.length > 0) {
        if (y > 180) {
          addPDFFooter(doc, doc.internal.pages.length);
          doc.addPage();
          y = 20;
        }

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text("Detalhamento de Despesas", margin, y);
        y += 8;

        doc.setFillColor(239, 68, 68);
        doc.rect(margin, y - 4, pageWidth - margin * 2, 8, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text("Data", margin + 2, y);
        doc.text("Descrição", margin + 25, y);
        doc.text("Categoria", margin + 95, y);
        doc.text("Valor", pageWidth - margin - 20, y);
        y += 6;

        doc.setTextColor(0, 0, 0);
        expenses.slice(0, 12).forEach((expense, index) => {
          if (index % 2 === 0) {
            doc.setFillColor(245, 245, 245);
            doc.rect(margin, y - 4, pageWidth - margin * 2, 6, "F");
          }
          doc.text(formatDate(new Date(expense.expense_date)), margin + 2, y);
          doc.text(expense.description.substring(0, 28), margin + 25, y);
          doc.text(getCategoryName(expense.category), margin + 95, y);
          doc.text(formatCurrency(expense.amount), pageWidth - margin - 20, y);
          y += 6;
        });

        if (expenses.length > 12) {
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text(`... e mais ${expenses.length - 12} registros`, margin, y + 2);
        }
      }

      // Footer on last page
      addPDFFooter(doc, doc.internal.pages.length);

      const fileName = `relatorio-financeiro-${format(startDate, "dd-MM-yyyy")}-a-${format(endDate, "dd-MM-yyyy")}.pdf`;
      doc.save(fileName);
      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters and Export */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <DateRangeFilter
          onDateRangeChange={(range) => {
            if (range) {
              setStartDate(range.from);
              setEndDate(range.to);
            } else {
              setStartDate(startOfMonth(new Date()));
              setEndDate(endOfMonth(new Date()));
            }
          }}
        />
        <Button onClick={exportPDF} disabled={generating} className="w-full sm:w-auto">
          {generating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Exportar PDF
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium">Ofertas</span>
            </div>
            <p className="text-base sm:text-xl font-bold text-green-800 dark:text-green-300">
              {formatCurrency(summary.totalOfferings)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium">Dízimos</span>
            </div>
            <p className="text-base sm:text-xl font-bold text-blue-800 dark:text-blue-300">
              {formatCurrency(summary.totalTithes)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-1">
              <TrendingDown className="h-4 w-4" />
              <span className="text-xs font-medium">Despesas</span>
            </div>
            <p className="text-base sm:text-xl font-bold text-red-800 dark:text-red-300">
              {formatCurrency(summary.totalExpenses)}
            </p>
          </CardContent>
        </Card>

        <Card className={summary.balance >= 0 ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"}>
          <CardContent className="p-3 sm:p-4">
            <div className={`flex items-center gap-2 mb-1 ${summary.balance >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
              <Wallet className="h-4 w-4" />
              <span className="text-xs font-medium">Saldo</span>
            </div>
            <p className={`text-base sm:text-xl font-bold ${summary.balance >= 0 ? "text-green-800 dark:text-green-300" : "text-red-800 dark:text-red-300"}`}>
              {formatCurrency(summary.balance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {monthlyData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm sm:text-base">Receitas vs Despesas</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData}>
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="income" name="Receitas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {expensesByCategory.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm sm:text-base">Despesas por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                    dataKey="total"
                    nameKey="category"
                    label={({ category, percent }) => `${getCategoryName(category)} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {expensesByCategory.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Offerings by Type */}
      {offeringsByType.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm sm:text-base">Ofertas por Tipo de Evento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {offeringsByType.map((item, index) => (
                <div key={item.type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-sm">{getEventTypeName(item.type)}</span>
                  </div>
                  <span className="text-sm font-medium">{formatCurrency(item.total)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Últimas Ofertas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-44 overflow-y-auto">
              {offerings.slice(0, 5).map((o) => (
                <div key={o.id} className="flex justify-between text-sm border-b pb-1">
                  <div>
                    <p className="font-medium text-xs">{getEventTypeName(o.event_type)}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(new Date(o.event_date))}</p>
                  </div>
                  <span className="text-green-600 font-medium text-sm">{formatCurrency(o.amount)}</span>
                </div>
              ))}
              {offerings.length === 0 && <p className="text-sm text-muted-foreground">Sem ofertas</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Últimos Dízimos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-44 overflow-y-auto">
              {tithes.slice(0, 5).map((t) => (
                <div key={t.id} className="flex justify-between text-sm border-b pb-1">
                  <div>
                    <p className="font-medium text-xs">{t.member?.full_name || "Membro"}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(new Date(t.tithe_date))}</p>
                  </div>
                  <span className="text-blue-600 font-medium text-sm">{formatCurrency(t.amount)}</span>
                </div>
              ))}
              {tithes.length === 0 && <p className="text-sm text-muted-foreground">Sem dízimos</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Últimas Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-44 overflow-y-auto">
              {expenses.slice(0, 5).map((e) => (
                <div key={e.id} className="flex justify-between text-sm border-b pb-1">
                  <div>
                    <p className="font-medium text-xs">{e.description}</p>
                    <p className="text-xs text-muted-foreground">{getCategoryName(e.category)} • {formatDate(new Date(e.expense_date))}</p>
                  </div>
                  <span className="text-red-600 font-medium text-sm">{formatCurrency(e.amount)}</span>
                </div>
              ))}
              {expenses.length === 0 && <p className="text-sm text-muted-foreground">Sem despesas</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
