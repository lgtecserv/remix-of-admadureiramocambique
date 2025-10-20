import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface GrowthChartProps {
  department?: string;
  leaderId?: string;
}

const GrowthChart = ({ department, leaderId }: GrowthChartProps = {}) => {
  const [data, setData] = useState<{ month: string; total: number; novos: number }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      let query = supabase.from("members").select("created_at, status");
      
      if (department && leaderId) {
        query = query.eq("department", department as any).eq("leader_id", leaderId);
      }

      const { data: members } = await query;

      if (members) {
        // Generate last 6 months data
        const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"];
        const mockData = months.map((month, index) => ({
          month,
          total: Math.floor(Math.random() * 50) + 20 + index * 5,
          novos: Math.floor(Math.random() * 20) + 5,
        }));
        
        setData(mockData);
      }
    };

    fetchData();
  }, [department, leaderId]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
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
