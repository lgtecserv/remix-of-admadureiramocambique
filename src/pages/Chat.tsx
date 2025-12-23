import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import ConversationList from "@/components/chat/ConversationList";
import ChatWindow from "@/components/chat/ChatWindow";
import { useConversations } from "@/hooks/useConversations";
import { useActiveConversation } from "@/contexts/ActiveConversationContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const Chat = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [role, setRole] = useState<string>("");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const { setActiveConversationId } = useActiveConversation();

  const {
    conversations,
    loading,
    createPrivateConversation,
    markAsRead,
  } = useConversations(user?.id);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();

      if (roleData) {
        setRole(roleData.role);
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", session.user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }
    };

    checkAuth();
  }, [navigate]);

  // Selecionar conversa automaticamente via query param
  useEffect(() => {
    const conversationFromUrl = searchParams.get("conversation");
    if (conversationFromUrl && conversations.length > 0) {
      const conversationExists = conversations.some(c => c.id === conversationFromUrl);
      if (conversationExists) {
        setSelectedConversationId(conversationFromUrl);
        setActiveConversationId(conversationFromUrl);
        if (isMobile) {
          setShowChat(true);
        }
        // Limpar o parâmetro da URL após selecionar
        setSearchParams({});
      }
    }
  }, [searchParams, conversations, isMobile, setActiveConversationId, setSearchParams]);

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);

  const getConversationName = () => {
    if (!selectedConversation) return "";
    
    if (selectedConversation.type === "general") {
      return selectedConversation.name || "Chat Geral";
    }
    
    const otherParticipant = selectedConversation.participants?.find(
      (p) => p.user_id !== user?.id
    );
    return otherParticipant?.profiles?.full_name || "Conversa Privada";
  };

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    setActiveConversationId(id);
    if (isMobile) {
      setShowChat(true);
    }
  };

  const handleBack = () => {
    setShowChat(false);
    setSelectedConversationId(null);
    setActiveConversationId(null);
  };

  const handleCreatePrivate = async (userId: string) => {
    const convId = await createPrivateConversation(userId);
    if (convId) {
      setSelectedConversationId(convId);
      if (isMobile) {
        setShowChat(true);
      }
    }
  };

  const handleMarkAsRead = () => {
    if (selectedConversationId) {
      markAsRead(selectedConversationId);
    }
  };

  return (
    <AppLayout userName={profile?.full_name} role={role} userEmail={user?.email} user={user}>
      <div className="flex flex-col h-[calc(100dvh-80px)] sm:h-[calc(100dvh-120px)] overflow-hidden">
        {/* Mobile: Show either list or chat */}
        {isMobile ? (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {showChat && selectedConversationId ? (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="border-b bg-card p-3 flex items-center gap-2 shrink-0">
                  <Button variant="ghost" size="sm" onClick={handleBack} className="shrink-0">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="text-base font-semibold truncate">{getConversationName()}</h2>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <ChatWindow
                    conversationId={selectedConversationId}
                    conversationName=""
                    userId={user?.id}
                    onMarkAsRead={handleMarkAsRead}
                    showHeader={false}
                  />
                </div>
              </div>
            ) : (
              <ConversationList
                conversations={conversations}
                selectedId={selectedConversationId}
                onSelect={handleSelectConversation}
                onCreatePrivate={handleCreatePrivate}
                currentUserId={user?.id}
                loading={loading}
              />
            )}
          </div>
        ) : (
          /* Desktop: Show both side by side */
          <div className="flex-1 flex overflow-hidden rounded-lg border">
            <div className="w-72 lg:w-80 shrink-0 border-r">
              <ConversationList
                conversations={conversations}
                selectedId={selectedConversationId}
                onSelect={handleSelectConversation}
                onCreatePrivate={handleCreatePrivate}
                currentUserId={user?.id}
                loading={loading}
              />
            </div>
            <ChatWindow
              conversationId={selectedConversationId}
              conversationName={getConversationName()}
              userId={user?.id}
              onMarkAsRead={handleMarkAsRead}
              showHeader={true}
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Chat;
