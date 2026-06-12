import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSelectedCongregation } from "@/contexts/SelectedCongregationContext";

interface GrowthChartProps {
  department?: string;
  leaderId?: string;
}

const GrowthChart = ({ department, leaderId }: GrowthChartProps = {}) => {
  const [data, setData] = useState<{ month: string; total: number; novos: number }[]>([]);
  const isMobile = useIsMobile();
  const { getEffectiveCongregationId } = useSelectedCongregation();
  const congId = getEffectiveCongregationId();

  useEffect(() => {
    const fetchData = async () => {
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      let query = supabase
        .from("members")
        .select("created_at, status")
        .gte("created_at", twelveMonthsAgo.toISOString());
      
      if (congId) query = query.eq("congregation_id", congId);
      if (department && leaderId) {
        query = query.eq("department", department as any).eq("leader_id", leaderId);
      }

      const { data: members } = await query;

      if (members) {
        const monthLabels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const now = new Date();
        const chartData: { month: string; total: number; novos: number }[] = [];

        for (let i = 11; i >= 0; i--) {
          const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthIndex = monthDate.getMonth();
          const year = monthDate.getFullYear();
          const monthLabel = monthLabels[monthIndex];

          const novos = members.filter((m) => {
            const createdDate = new Date(m.created_at);
            return (
              createdDate.getMonth() === monthIndex &&
              createdDate.getFullYear() === year
            );
          }).length;

          const total = members.filter((m) => {
            const createdDate = new Date(m.created_at);
            return createdDate <= new Date(year, monthIndex + 1, 0);
          }).length;

          chartData.push({
            month: `${monthLabel}/${year.toString().slice(2)}`,
            total,
            novos,
          });
        }
        
        setData(chartData);
      }
    };

    fetchData();
  }, [department, leaderId, congId]);

  return (
    <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="month" 
          tick={{ fontSize: isMobile ? 10 : 12 }}
          angle={isMobile ? -45 : 0}
          textAnchor={isMobile ? "end" : "middle"}
          height={isMobile ? 60 : 30}
        />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} name="Total" />
        <Line type="monotone" dataKey="novos" stroke="hsl(var(--chart-1))" strokeWidth={2} name="Novos" />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default GrowthChart;
