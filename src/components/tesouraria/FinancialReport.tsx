import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Download } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { DateRangeFilter } from "@/components/common/DateRangeFilter";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import jsPDF from "jspdf";

interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
}

interface OfferingByType {
  event_type: string;
  total: number;
}

interface TitheByMonth {
  month: number;
  total: number;
}

interface ExpenseByCategory {
  category: string;
  total: number;
}

export const FinancialReport = () => {
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const [summary, setSummary] = useState<FinancialSummary>({ totalIncome: 0, totalExpenses: 0, balance: 0 });
  const [offeringsByType, setOfferingsByType] = useState<OfferingByType[]>([]);
  const [tithesByMonth, setTithesByMonth] = useState<TitheByMonth[]>([]);
  const [expensesByCategory, setExpensesByCategory] = useState<ExpenseByCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const loadReport = async () => {
    setLoading(true);
    const startDateStr = format(startDate, "yyyy-MM-dd");
    const endDateStr = format(endDate, "yyyy-MM-dd");

    // Carregar ofertas
    const { data: offerings } = await supabase
      .from("offerings")
      .select("amount, event_type")
      .gte("event_date", startDateStr)
      .lte("event_date", endDateStr);

    // Carregar dízimos
    const { data: tithes } = await supabase
      .from("tithes")
      .select("amount, tithe_month")
      .gte("tithe_date", startDateStr)
      .lte("tithe_date", endDateStr);

    // Carregar gastos
    const { data: expenses } = await supabase
      .from("expenses")
      .select("amount, category")
      .gte("expense_date", startDateStr)
      .lte("expense_date", endDateStr);

    // Carregar ajustes
    const { data: adjustments } = await supabase
      .from("balance_adjustments")
      .select("amount")
      .gte("adjustment_date", startDateStr)
      .lte("adjustment_date", endDateStr);

    const offeringsTotal = offerings?.reduce((sum, o) => sum + Number(o.amount), 0) || 0;
    const tithesTotal = tithes?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    const adjustmentsTotal = adjustments?.reduce((sum, a) => sum + Number(a.amount), 0) || 0;
    const expensesTotal = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

    const totalIncome = offeringsTotal + tithesTotal + adjustmentsTotal;
    const totalExpenses = expensesTotal;
    const balance = totalIncome - totalExpenses;

    setSummary({ totalIncome, totalExpenses, balance });

    // Agrupar ofertas por tipo
    const offeringsMap: Record<string, number> = {};
    offerings?.forEach((o) => {
      offeringsMap[o.event_type] = (offeringsMap[o.event_type] || 0) + Number(o.amount);
    });
    setOfferingsByType(Object.entries(offeringsMap).map(([event_type, total]) => ({ event_type, total })));

    // Agrupar dízimos por mês
    const tithesMap: Record<number, number> = {};
    tithes?.forEach((t) => {
      tithesMap[t.tithe_month] = (tithesMap[t.tithe_month] || 0) + Number(t.amount);
    });
    setTithesByMonth(Object.entries(tithesMap).map(([month, total]) => ({ month: Number(month), total })));

    // Agrupar gastos por categoria
    const expensesMap: Record<string, number> = {};
    expenses?.forEach((e) => {
      expensesMap[e.category] = (expensesMap[e.category] || 0) + Number(e.amount);
    });
    setExpensesByCategory(Object.entries(expensesMap).map(([category, total]) => ({ category, total })));

    setLoading(false);
  };

  useEffect(() => {
    loadReport();
  }, [startDate, endDate]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-MZ", {
      style: "currency",
      currency: "MZN",
    }).format(value);
  };

  const getMonthName = (month: number) => {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return months[month - 1] || "";
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Relatório Financeiro", 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Período: ${format(startDate, "dd/MM/yyyy")} - ${format(endDate, "dd/MM/yyyy")}`, 20, 30);
    
    doc.setFontSize(14);
    doc.text("Resumo Financeiro", 20, 45);
    doc.setFontSize(12);
    doc.text(`Entradas: ${formatCurrency(summary.totalIncome)}`, 20, 55);
    doc.text(`Saídas: ${formatCurrency(summary.totalExpenses)}`, 20, 65);
    doc.text(`Saldo: ${formatCurrency(summary.balance)}`, 20, 75);
    
    doc.setFontSize(14);
    doc.text("Ofertas por Tipo", 20, 90);
    doc.setFontSize(10);
    let yPos = 100;
    offeringsByType.forEach((o) => {
      doc.text(`${o.event_type}: ${formatCurrency(o.total)}`, 20, yPos);
      yPos += 10;
    });
    
    doc.addPage();
    doc.setFontSize(14);
    doc.text("Dízimos por Mês", 20, 20);
    doc.setFontSize(10);
    yPos = 30;
    tithesByMonth.forEach((t) => {
      doc.text(`${getMonthName(t.month)}: ${formatCurrency(t.total)}`, 20, yPos);
      yPos += 10;
    });
    
    doc.setFontSize(14);
    doc.text("Gastos por Categoria", 20, yPos + 15);
    doc.setFontSize(10);
    yPos += 25;
    expensesByCategory.forEach((e) => {
      doc.text(`${e.category}: ${formatCurrency(e.total)}`, 20, yPos);
      yPos += 10;
    });
    
    doc.save(`relatorio-financeiro-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("PDF gerado com sucesso");
  };

  if (loading) {
    return <div className="text-center py-8">Carregando relatório...</div>;
  }

  return (
    <div className="space-y-6">
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
        <Button onClick={exportPDF}>
          <Download className="mr-2 h-4 w-4" />
          Exportar PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Total de Entradas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalIncome)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Total de Saídas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalExpenses)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Saldo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${summary.balance >= 0 ? "text-primary" : "text-destructive"}`}>
              {formatCurrency(summary.balance)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Ofertas por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            {offeringsByType.length > 0 ? (
              <div className="space-y-3">
                {offeringsByType.map((offering) => (
                  <div key={offering.event_type} className="flex justify-between items-center">
                    <span className="font-medium">{offering.event_type}</span>
                    <span className="text-muted-foreground">{formatCurrency(offering.total)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Nenhuma oferta no período</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dízimos por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            {tithesByMonth.length > 0 ? (
              <div className="space-y-3">
                {tithesByMonth.map((tithe) => (
                  <div key={tithe.month} className="flex justify-between items-center">
                    <span className="font-medium">{getMonthName(tithe.month)}</span>
                    <span className="text-muted-foreground">{formatCurrency(tithe.total)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Nenhum dízimo no período</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gastos por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {expensesByCategory.length > 0 ? (
              <div className="space-y-3">
                {expensesByCategory.map((expense) => (
                  <div key={expense.category} className="flex justify-between items-center">
                    <span className="font-medium">{expense.category}</span>
                    <span className="text-muted-foreground">{formatCurrency(expense.total)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Nenhum gasto no período</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Gastos</CardTitle>
          </CardHeader>
          <CardContent>
            {expensesByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    dataKey="total"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry) => entry.category}
                  >
                    {expensesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">Nenhum dado para visualizar</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
