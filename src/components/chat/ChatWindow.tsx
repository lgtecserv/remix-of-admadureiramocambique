import { useEffect, useRef, useState } from "react";
import { useMessages } from "@/hooks/useMessages";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useChatNotificationSound } from "@/hooks/useChatNotificationSound";
import { supabase } from "@/integrations/supabase/client";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import TypingIndicator from "./TypingIndicator";
import { UserAvatar } from "@/components/common/UserAvatar";
import { Loader2 } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ChatWindowProps {
  conversationId: string | null;
  conversationName: string;
  userId: string | undefined;
  onMarkAsRead: () => void;
  showHeader?: boolean;
}

const ChatWindow = ({ conversationId, conversationName, userId, onMarkAsRead, showHeader = true }: ChatWindowProps) => {
  const { messages, loading, sendMessage, editMessage, deleteMessage } = useMessages(conversationId, userId);
  const { typingUsers, setTyping } = useTypingIndicator(conversationId, userId);
  const { notifyNewMessage } = useChatNotificationSound(userId);
  const [participants, setParticipants] = useState<Array<{ user_id: string }>>([]);
  const [conversationAvatar, setConversationAvatar] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);
  const prevMessagesLengthRef = useRef(messages.length);

  // Buscar participantes e avatar da conversa
  useEffect(() => {
    const loadConversationData = async () => {
      if (!conversationId) return;
      
      const { data: participantsData } = await supabase
        .from('conversation_participants')
        .select('user_id, profiles(avatar_url)')
        .eq('conversation_id', conversationId)
        .neq('user_id', userId!);
      
      setParticipants(participantsData || []);
      
      if (participantsData && participantsData.length > 0) {
        setConversationAvatar(participantsData[0]?.profiles?.avatar_url || null);
      }
    };
    loadConversationData();
  }, [conversationId, userId]);

  // Verificar se usuário está próximo ao final da lista
  const isNearBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return true;
    const threshold = 100;
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  };

  // Auto-scroll inteligente - só scrolla se estiver perto do fim
  useEffect(() => {
    if (messages.length > 0 && (!hasScrolledRef.current || isNearBottom())) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      hasScrolledRef.current = true;
    }
  }, [messages]);

  // Tocar som quando nova mensagem chega
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      const newMessage = messages[messages.length - 1];
      if (newMessage) {
        notifyNewMessage(newMessage.id, newMessage.sender_id);
      }
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages, notifyNewMessage]);

  useEffect(() => {
    if (conversationId && messages.length > 0) {
      onMarkAsRead();
    }
  }, [conversationId, messages.length]);

  const groupMessagesByDate = () => {
    const groups: { date: Date; messages: typeof messages }[] = [];
    
    messages.forEach((message) => {
      const messageDate = new Date(message.created_at);
      const lastGroup = groups[groups.length - 1];
      
      if (lastGroup && isSameDay(lastGroup.date, messageDate)) {
        lastGroup.messages.push(message);
      } else {
        groups.push({ date: messageDate, messages: [message] });
      }
    });
    
    return groups;
  };

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <p className="text-muted-foreground">Selecione uma conversa para começar</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full min-h-0">
      {/* Header */}
      {showHeader && (
        <div className="border-b bg-card p-3 sm:p-4 shrink-0">
          <div className="flex items-center gap-3">
            <UserAvatar
              avatarUrl={conversationAvatar}
              fullName={conversationName}
              size="sm"
            />
            <h2 className="text-base sm:text-lg font-semibold truncate">{conversationName}</h2>
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 min-h-0">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma mensagem ainda. Seja o primeiro a enviar!
          </div>
        ) : (
          groupMessagesByDate().map((group, idx) => (
            <div key={idx}>
              <div className="flex justify-center my-4">
                <span className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">
                  {format(group.date, "dd 'de' MMMM", { locale: ptBR })}
                </span>
              </div>
              {group.messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwn={message.sender_id === userId}
                  participants={participants}
                  onEdit={editMessage}
                  onDelete={deleteMessage}
                />
              ))}
            </div>
          ))
        )}
        <TypingIndicator users={typingUsers} />
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0">
        <MessageInput onSend={sendMessage} disabled={loading} onTyping={setTyping} />
      </div>
    </div>
  );
};

export default ChatWindow;
