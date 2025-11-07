import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import ConversationList from "@/components/chat/ConversationList";
import ChatWindow from "@/components/chat/ChatWindow";
import { useConversations } from "@/hooks/useConversations";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const Chat = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [role, setRole] = useState<string>("");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);

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

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);

  const getConversationName = () => {
    if (!selectedConversation) return "";
    
    if (selectedConversation.type === "general") {
      return selectedConversation.name || "Chat Geral";
    }
    
    const otherParticipant = selectedConversation.participants?.find(
      (p) => p.user_id !== user?.id
    );
    return otherParticipant?.profiles.full_name || "Conversa Privada";
  };

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    if (isMobile) {
      setShowChat(true);
    }
  };

  const handleBack = () => {
    setShowChat(false);
    setSelectedConversationId(null);
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
      <div className="h-[calc(100vh-120px)] flex flex-col">
        {/* Mobile: Show either list or chat */}
        {isMobile ? (
          <div className="flex-1 flex flex-col">
            {showChat && selectedConversationId ? (
              <div className="flex-1 flex flex-col">
                <div className="border-b bg-card p-4 flex items-center gap-3">
                  <Button variant="ghost" size="icon" onClick={handleBack}>
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <h2 className="text-lg font-semibold">{getConversationName()}</h2>
                </div>
                <div className="flex-1 overflow-hidden">
                  <ChatWindow
                    conversationId={selectedConversationId}
                    conversationName={getConversationName()}
                    userId={user?.id}
                    onMarkAsRead={handleMarkAsRead}
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
            <div className="w-80 shrink-0">
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
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Chat;
