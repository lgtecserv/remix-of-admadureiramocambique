import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSelectedCongregation } from "@/contexts/SelectedCongregationContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";

interface Congregation {
  id: string;
  name: string;
}

export function CongregationSelector() {
  const {
    selectedCongregationId,
    setSelectedCongregationId,
    userCongregationId,
    isSuperAdmin,
    userRole,
    loading: contextLoading,
  } = useSelectedCongregation();

  const [congregations, setCongregations] = useState<Congregation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCongregations = async () => {
      if (isSuperAdmin) {
        // Super admin vê todas
        const { data } = await supabase
          .from("congregations")
          .select("id, name")
          .eq("active", true)
          .order("name");
        if (data) setCongregations(data);
      } else if (userCongregationId) {
        // Pastor/líder vê apenas a sua
        const { data } = await supabase
          .from("congregations")
          .select("id, name")
          .eq("id", userCongregationId)
          .single();
        if (data) setCongregations([data]);
      }
      setLoading(false);
    };

    if (!contextLoading) {
      loadCongregations();
    }
  }, [isSuperAdmin, userCongregationId, contextLoading]);

  if (contextLoading || loading) return null;

  // Para pastor/líder: mostrar badge estático com nome da congregação
  if (!isSuperAdmin) {
    const congName = congregations.length > 0 ? congregations[0].name : "—";
    return (
      <div className="flex items-center gap-1.5">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <Badge variant="outline" className="text-xs font-medium whitespace-nowrap">
          {congName}
        </Badge>
      </div>
    );
  }

  // Para super admin: dropdown com todas as congregações
  return (
    <div className="flex items-center gap-1.5">
      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
      <Select
        value={selectedCongregationId || "all"}
        onValueChange={(value) => setSelectedCongregationId(value)}
      >
        <SelectTrigger className="h-8 w-[180px] text-xs">
          <SelectValue placeholder="Congregação" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as congregações</SelectItem>
          {congregations.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
