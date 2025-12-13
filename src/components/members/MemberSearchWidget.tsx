import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, User, Users } from "lucide-react";
import MemberIdCard from "./MemberIdCard";

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

interface MemberSearchWidgetProps {
  department?: string;
  leaderId?: string;
}

const MemberSearchWidget = ({ department, leaderId }: MemberSearchWidgetProps) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadMembers();
  }, [department, leaderId]);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredMembers([]);
    } else {
      const filtered = members.filter((m) =>
        m.full_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredMembers(filtered.slice(0, 10));
    }
  }, [searchTerm, members]);

  const loadMembers = async () => {
    let query = supabase.from("members").select("*");

    if (department && leaderId) {
      query = query.eq("department", department as any).eq("leader_id", leaderId);
    }

    const { data } = await query.order("full_name");
    if (data) {
      setMembers(data as Member[]);
    }
  };

  const handleMemberClick = (member: Member) => {
    setSelectedMember(member);
    setDialogOpen(true);
    setSearchTerm("");
    setFilteredMembers([]);
  };

  return (
    <>
      <div className="w-full">
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Campo de pesquisa */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Pesquisar membro pelo nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />

            {/* Resultados da pesquisa (dropdown) */}
            {filteredMembers.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 border rounded-lg bg-background shadow-lg z-50 max-h-64 overflow-y-auto">
                {filteredMembers.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => handleMemberClick(member)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left border-b last:border-b-0"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/20 bg-muted flex items-center justify-center shrink-0">
                      {member.photo_url ? (
                        <img
                          src={member.photo_url}
                          alt={member.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">{member.full_name}</p>
                      <p className="text-xs text-muted-foreground">{member.phone_number}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Mensagem de nenhum resultado */}
            {searchTerm.trim() !== "" && filteredMembers.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 border rounded-lg bg-background shadow-lg z-50 p-4">
                <p className="text-sm text-muted-foreground text-center">
                  Nenhum membro encontrado
                </p>
              </div>
            )}
          </div>

          {/* Botão Ver Membros */}
          <Button
            onClick={() => navigate("/dashboard/members")}
            variant="outline"
            className="w-full sm:w-auto shrink-0"
          >
            <Users className="h-4 w-4 mr-2" />
            Ver Membros
          </Button>
        </div>
      </div>

      <MemberIdCard
        member={selectedMember}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
};

export default MemberSearchWidget;
