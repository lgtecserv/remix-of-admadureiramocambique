import { useEffect, useState } from "react";
import { supabase, getDepartmentLabel } from "@/lib/supabase";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const DepartmentChart = () => {
  const [data, setData] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: members } = await supabase.from("members").select("department");

      if (members) {
        const deptCount: Record<string, number> = {};
        members.forEach((m) => {
          deptCount[m.department] = (deptCount[m.department] || 0) + 1;
        });

        const chartData = Object.entries(deptCount).map(([dept, value]) => ({
          name: getDepartmentLabel(dept),
          value,
        }));

        setData(chartData);
      }
    };

    fetchData();
  }, []);

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
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: window.innerWidth < 768 ? '12px' : '14px' }} />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default DepartmentChart;
