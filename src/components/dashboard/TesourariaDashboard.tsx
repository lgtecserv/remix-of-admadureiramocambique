import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, Wallet, Package } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface TesourariaDashboardProps {
  user: User;
  userEmail?: string;
}

const TesourariaDashboard = ({ user, userEmail }: TesourariaDashboardProps) => {
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [balance, setBalance] = useState(0);
  const [profile, setProfile] = useState<any>(null);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [inventoryStats, setInventoryStats] = useState({
    totalItems: 0,
    totalQuantity: 0,
    perfectCondition: 0,
    damagedCondition: 0,
  });

  const loadFinancialStats = async () => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Ofertas
    const { data: offeringsData } = await supabase
      .from("offerings")
      .select("amount, event_date")
      .gte("event_date", startOfYear.toISOString());

    const totalOfferings = offeringsData?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;

    // Dízimos
    const { data: tithesData } = await supabase
      .from("tithes")
      .select("amount, tithe_date")
      .gte("tithe_date", startOfYear.toISOString());

    const totalTithes = tithesData?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;

    setTotalIncome(totalOfferings + totalTithes);

    // Gastos
    const { data: expensesData } = await supabase
      .from("expenses")
      .select("amount, expense_date")
      .gte("expense_date", startOfYear.toISOString());

    const expenses = expensesData?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
    setTotalExpenses(expenses);
    setBalance(totalOfferings + totalTithes - expenses);

    // Dados mensais
    const monthlyStats = new Map();
    
    // Processar ofertas
    offeringsData?.forEach((item) => {
      const month = new Date(item.event_date).toLocaleString("pt-BR", { month: "short" });
      if (!monthlyStats.has(month)) {
        monthlyStats.set(month, { month, entradas: 0, saidas: 0 });
      }
      monthlyStats.get(month).entradas += Number(item.amount);
    });

    // Processar dízimos
    tithesData?.forEach((item) => {
      const month = new Date(item.tithe_date).toLocaleString("pt-BR", { month: "short" });
      if (!monthlyStats.has(month)) {
        monthlyStats.set(month, { month, entradas: 0, saidas: 0 });
      }
      monthlyStats.get(month).entradas += Number(item.amount);
    });

    // Processar gastos
    expensesData?.forEach((item) => {
      const month = new Date(item.expense_date).toLocaleString("pt-BR", { month: "short" });
      if (!monthlyStats.has(month)) {
        monthlyStats.set(month, { month, entradas: 0, saidas: 0 });
      }
      monthlyStats.get(month).saidas += Number(item.amount);
    });

    setMonthlyData(Array.from(monthlyStats.values()));
  };

  const loadProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    setProfile(data);
  };

  const loadInventoryStats = async () => {
    const { data } = await supabase.from("church_assets").select("*");
    
    if (data) {
      setInventoryStats({
        totalItems: data.length,
        totalQuantity: data.reduce((sum, item) => sum + item.quantity, 0),
        perfectCondition: data.filter((item) => item.condition === "perfeito").length,
        damagedCondition: data.filter((item) => item.condition === "danificado").length,
      });
    }
  };

  useEffect(() => {
    loadFinancialStats();
    loadProfile();
    loadInventoryStats();

    const channel = supabase
      .channel("tesouraria-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "offerings" },
        () => loadFinancialStats()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tithes" },
        () => loadFinancialStats()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        () => loadFinancialStats()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "church_assets" },
        () => loadInventoryStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-MZ", {
      style: "currency",
      currency: "MZN",
    }).format(value);
  };

  return (
    <AppLayout userName={profile?.full_name} role="leader" department="tesouraria" userEmail={userEmail} user={user}>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Painel de Tesouraria
          </h2>
          <p className="text-muted-foreground">Gerencie as finanças da igreja</p>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Entradas</CardTitle>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalIncome)}</div>
              <p className="text-xs text-muted-foreground mt-1">Ofertas + Dízimos</p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Saídas</CardTitle>
              <TrendingDown className="h-5 w-5 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
              <p className="text-xs text-muted-foreground mt-1">Gastos do ano</p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
              <Wallet className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${balance >= 0 ? "text-green-500" : "text-red-500"}`}>
                {formatCurrency(balance)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Entradas - Saídas</p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inventário</CardTitle>
              <Package className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inventoryStats.totalQuantity}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {inventoryStats.totalItems} tipos de itens
              </p>
              <div className="flex gap-2 mt-2 text-xs">
                <span className="text-green-500">✓ {inventoryStats.perfectCondition} OK</span>
                <span className="text-yellow-500">⚠ {inventoryStats.damagedCondition} Danif.</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Entradas vs Saídas por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar dataKey="entradas" fill="hsl(142, 76%, 36%)" name="Entradas" />
                  <Bar dataKey="saidas" fill="hsl(0, 84%, 60%)" name="Saídas" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhum dado financeiro registrado ainda
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default TesourariaDashboard;
