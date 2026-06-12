import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useSelectedCongregation } from "@/contexts/SelectedCongregationContext";

interface StatusChartProps {
  department?: string;
  leaderId?: string;
}

const STATUS_COLORS = {
  Novo: "hsl(var(--chart-1))",
  Ativo: "hsl(var(--chart-2))",
  Inativo: "hsl(var(--chart-3))",
};

const StatusChart = ({ department, leaderId }: StatusChartProps = {}) => {
  const [data, setData] = useState<{ name: string; value: number }[]>([]);
  const { getEffectiveCongregationId } = useSelectedCongregation();
  const congId = getEffectiveCongregationId();

  useEffect(() => {
    const fetchData = async () => {
      let query = supabase.from("members").select("status");
      
      if (congId) query = query.eq("congregation_id", congId);
      if (department && leaderId) {
        query = query.eq("department", department as any).eq("leader_id", leaderId);
      }

      const { data: members } = await query;

      if (members) {
        const statusCount: Record<string, number> = {};
        members.forEach((m) => {
          const status = m.status === "novo" ? "Novo" : m.status === "ativo" ? "Ativo" : "Inativo";
          statusCount[status] = (statusCount[status] || 0) + 1;
        });

        const chartData = Object.entries(statusCount).map(([name, value]) => ({
          name,
          value,
        }));

        setData(chartData);
      }
    };

    fetchData();
  }, [department, leaderId, congId]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={(entry) => {
            const isMobile = window.innerWidth < 768;
            return isMobile ? `${(entry.percent * 100).toFixed(0)}%` : `${entry.name} ${(entry.percent * 100).toFixed(0)}%`;
          }}
          outerRadius={window.innerWidth < 768 ? 60 : 80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: window.innerWidth < 768 ? '12px' : '14px' }} />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default StatusChart;
