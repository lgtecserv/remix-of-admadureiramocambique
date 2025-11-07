import { useEffect, useRef } from "react";
import { useMessages } from "@/hooks/useMessages";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import { Loader2 } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ChatWindowProps {
  conversationId: string | null;
  conversationName: string;
  userId: string | undefined;
  onMarkAsRead: () => void;
}

const ChatWindow = ({ conversationId, conversationName, userId, onMarkAsRead }: ChatWindowProps) => {
  const { messages, loading, sendMessage } = useMessages(conversationId, userId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);

  useEffect(() => {
    if (!hasScrolledRef.current && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      hasScrolledRef.current = true;
    }
  }, [messages]);

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
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-card p-4">
        <h2 className="text-lg font-semibold">{conversationName}</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                />
              ))}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <MessageInput onSend={sendMessage} disabled={loading} />
    </div>
  );
};

export default ChatWindow;
