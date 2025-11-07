import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { getDepartmentLabel } from "@/lib/supabase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Member {
  id: string;
  full_name: string;
  phone_number: string;
  department: string;
  status: string;
  baptism_date: string | null;
  leader_id: string;
}

interface MemberCardProps {
  member: Member;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

const MemberCard = ({ member, canEdit, canDelete, onEdit, onDelete }: MemberCardProps) => {
  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      novo: "secondary",
      ativo: "default",
      inativo: "outline",
    };
    const labels: Record<string, string> = {
      novo: "Novo",
      ativo: "Ativo",
      inativo: "Inativo",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium">{member.full_name}</h3>
              <p className="text-sm text-muted-foreground">{member.phone_number}</p>
            </div>
            {getStatusBadge(member.status)}
          </div>
          
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Departamento:</span>
              <span>{getDepartmentLabel(member.department)}</span>
            </div>
            {member.baptism_date && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Batismo:</span>
                <span>{format(new Date(member.baptism_date), "dd/MM/yyyy", { locale: ptBR })}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            {canEdit && (
              <Button variant="outline" size="sm" onClick={onEdit} className="flex-1">
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>
            )}
            {canDelete && (
              <Button variant="destructive" size="sm" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MemberCard;
