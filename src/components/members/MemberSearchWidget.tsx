import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, User } from "lucide-react";
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
      <Card className="shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Pesquisar Membros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Digite o nome do membro..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {filteredMembers.length > 0 && (
            <div className="mt-3 border rounded-lg divide-y max-h-64 overflow-y-auto">
              {filteredMembers.map((member) => (
                <button
                  key={member.id}
                  onClick={() => handleMemberClick(member)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
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

          {searchTerm.trim() !== "" && filteredMembers.length === 0 && (
            <p className="mt-3 text-sm text-muted-foreground text-center py-4">
              Nenhum membro encontrado
            </p>
          )}
        </CardContent>
      </Card>

      <MemberIdCard
        member={selectedMember}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
};

export default MemberSearchWidget;
