import { useState, useEffect } from "react";
import { Conversation } from "@/hooks/useConversations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Search, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreatePrivate: (userId: string) => void;
  currentUserId: string | undefined;
  loading: boolean;
}

const ConversationList = ({
  conversations,
  selectedId,
  onSelect,
  onCreatePrivate,
  currentUserId,
  loading,
}: ConversationListProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select(`
          user_id,
          role,
          profiles (
            id,
            full_name,
            email
          )
        `)
        .in("role", ["leader", "pastor"])
        .neq("user_id", currentUserId!);

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (dialogOpen) {
      loadUsers();
    }
  }, [dialogOpen]);

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    
    if (conv.type === "general") {
      return conv.name?.toLowerCase().includes(query);
    }
    
    return conv.participants?.some((p) =>
      p.profiles.full_name.toLowerCase().includes(query)
    );
  });

  const getConversationName = (conv: Conversation) => {
    if (conv.type === "general") {
      return conv.name || "Chat Geral";
    }
    
    const otherParticipant = conv.participants?.find((p) => p.user_id !== currentUserId);
    return otherParticipant?.profiles.full_name || "Conversa Privada";
  };

  const handleCreatePrivate = (userId: string) => {
    onCreatePrivate(userId);
    setDialogOpen(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col border-r bg-card">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Mensagens</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="icon" variant="ghost">
                <Plus className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md w-[calc(100%-2rem)] mx-auto">
              <DialogHeader>
                <DialogTitle>Nova Conversa</DialogTitle>
                <DialogDescription>
                  Selecione um líder ou pastor para iniciar uma conversa privada
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[400px]">
                {loadingUsers ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {users.map((user) => (
                      <Button
                        key={user.user_id}
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleCreatePrivate(user.user_id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium">
                              {user.profiles?.full_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="text-left">
                            <p className="font-medium">{user.profiles?.full_name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>Nenhuma conversa encontrada</p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = conv.id === selectedId;
              const hasUnread = (conv.unreadCount || 0) > 0;

              return (
                <button
                  key={conv.id}
                  onClick={() => onSelect(conv.id)}
                  className={cn(
                    "w-full p-3 rounded-lg text-left transition-colors hover:bg-muted/50",
                    isSelected && "bg-muted"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-medium">
                        {getConversationName(conv).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className={cn("font-medium truncate", hasUnread && "text-primary")}>
                          {getConversationName(conv)}
                        </p>
                        {hasUnread && (
                          <Badge variant="default" className="ml-2 shrink-0">
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                      {conv.lastMessage && (
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.lastMessage.content}
                        </p>
                      )}
                      {conv.lastMessage && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(conv.lastMessage.created_at), "HH:mm", { locale: ptBR })}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ConversationList;
