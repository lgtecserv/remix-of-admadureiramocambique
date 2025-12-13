import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format, differenceInYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getDepartmentLabel } from "@/lib/supabase";
import { User, Calendar, MapPin, Briefcase, Church, Users } from "lucide-react";

interface Member {
  id: string;
  full_name: string;
  phone_number: string;
  department: string;
  status: string;
  gender?: string | null;
  member_type?: string | null;
  photo_url?: string | null;
  birth_date?: string | null;
  baptism_date?: string | null;
  created_at: string;
  address?: string | null;
  occupation?: string | null;
  marital_status?: string | null;
}

interface MemberIdCardProps {
  member: Member | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getMemberTypeLabel = (type: string | null | undefined) => {
  switch (type) {
    case "obreiro": return "Obreiro";
    case "congregado": return "Congregado";
    case "membro": return "Membro da Igreja";
    default: return "Membro";
  }
};

const getGenderLabel = (gender: string | null | undefined) => {
  switch (gender) {
    case "masculino": return "Masculino";
    case "feminino": return "Feminino";
    default: return "Não informado";
  }
};

const calculateAge = (birthDate: string | null | undefined): number | null => {
  if (!birthDate) return null;
  return differenceInYears(new Date(), new Date(birthDate));
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

const MemberIdCard = ({ member, open, onOpenChange }: MemberIdCardProps) => {
  if (!member) return null;

  const age = calculateAge(member.birth_date);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs w-[calc(100%-2rem)] p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-primary/90 to-primary p-2.5 text-primary-foreground">
          <DialogHeader>
            <DialogTitle className="text-center text-sm font-bold text-primary-foreground">
              Cartão de Identificação
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="p-3 space-y-2">
          {/* Foto e Nome */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-primary/20 bg-muted flex items-center justify-center">
              {member.photo_url ? (
                <img
                  src={member.photo_url}
                  alt={member.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-lg font-bold text-muted-foreground">
                  {getInitials(member.full_name)}
                </span>
              )}
            </div>
            <div className="text-center">
              <h3 className="text-sm font-bold text-foreground">{member.full_name}</h3>
              <Badge variant="secondary" className="mt-0.5 text-xs">
                {getDepartmentLabel(member.department)}
              </Badge>
            </div>
          </div>

          {/* Informações em Grid */}
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            {/* Sexo */}
            <div className="flex items-center gap-1.5 p-1.5 bg-muted/50 rounded-md">
              <User className="h-3 w-3 text-primary shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">Sexo</p>
                <p className="font-medium text-foreground text-xs">{getGenderLabel(member.gender)}</p>
              </div>
            </div>

            {/* Idade */}
            <div className="flex items-center gap-1.5 p-1.5 bg-muted/50 rounded-md">
              <Calendar className="h-3 w-3 text-primary shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">Idade</p>
                <p className="font-medium text-foreground text-xs">
                  {age !== null ? `${age} anos` : "N/I"}
                </p>
              </div>
            </div>

            {/* Data de Nascimento */}
            <div className="flex items-center gap-1.5 p-1.5 bg-muted/50 rounded-md">
              <Calendar className="h-3 w-3 text-chart-1 shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">Nascimento</p>
                <p className="font-medium text-foreground text-xs">
                  {member.birth_date
                    ? format(new Date(member.birth_date), "dd/MM/yyyy", { locale: ptBR })
                    : "N/I"}
                </p>
              </div>
            </div>

            {/* Tipo de Membro */}
            <div className="flex items-center gap-1.5 p-1.5 bg-muted/50 rounded-md">
              <Users className="h-3 w-3 text-chart-2 shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">Classificação</p>
                <p className="font-medium text-foreground text-xs">{getMemberTypeLabel(member.member_type)}</p>
              </div>
            </div>

            {/* Membro desde */}
            <div className="flex items-center gap-1.5 p-1.5 bg-muted/50 rounded-md col-span-2">
              <Church className="h-3 w-3 text-chart-3 shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">Membro desde</p>
                <p className="font-medium text-foreground text-xs">
                  {format(new Date(member.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>

            {/* Data de Batismo */}
            {member.baptism_date && (
              <div className="flex items-center gap-1.5 p-1.5 bg-muted/50 rounded-md col-span-2">
                <Church className="h-3 w-3 text-chart-4 shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Data de Batismo</p>
                  <p className="font-medium text-foreground text-xs">
                    {format(new Date(member.baptism_date), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Status */}
          <div className="flex justify-center pt-1.5 border-t">
            <Badge
              className="text-xs"
              variant={member.status === "ativo" ? "default" : member.status === "novo" ? "secondary" : "outline"}
            >
              {member.status === "ativo" ? "Ativo" : member.status === "novo" ? "Novo" : "Inativo"}
            </Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MemberIdCard;
