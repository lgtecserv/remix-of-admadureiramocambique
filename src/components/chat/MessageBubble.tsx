import { Message } from "@/hooks/useMessages";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

const MessageBubble = ({ message, isOwn }: MessageBubbleProps) => {
  return (
    <div className={cn("flex flex-col gap-0.5 mb-3 sm:mb-4", isOwn ? "items-end" : "items-start")}>
      {!isOwn && (
        <span className="text-xs text-muted-foreground px-2 sm:px-3 truncate max-w-[200px]">
          {message.profiles?.full_name || "Usuário"}
        </span>
      )}
      <div
        className={cn(
          "max-w-[85%] sm:max-w-[70%] rounded-2xl px-3 sm:px-4 py-2 break-words",
          isOwn
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
      </div>
      <span className="text-[10px] sm:text-xs text-muted-foreground px-2 sm:px-3">
        {format(new Date(message.created_at), "HH:mm", { locale: ptBR })}
      </span>
    </div>
  );
};

export default MessageBubble;
