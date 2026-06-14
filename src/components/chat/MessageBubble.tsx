import { useState } from "react";
import { Message } from "@/hooks/useMessages";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { MoreVertical, Pencil, Trash, Check, X } from "lucide-react";
import ReadReceipt from "./ReadReceipt";
import { UserAvatar } from "@/components/common/UserAvatar";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  participants?: Array<{ user_id: string }>;
  onEdit?: (messageId: string, newContent: string) => Promise<void>;
  onDelete?: (messageId: string) => Promise<void>;
}

const MessageBubble = ({ message, isOwn, participants, onEdit, onDelete }: MessageBubbleProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  // Função para detectar se é apenas emoji/sticker (máximo 4 caracteres de emoji)
  const isOnlyEmoji = (text: string) => {
    const emojiRegex = /^[\p{Emoji}\s]+$/u;
    return emojiRegex.test(text) && text.trim().length <= 4;
  };

  const handleEdit = async () => {
    if (!onEdit || editContent.trim() === message.content) {
      setIsEditing(false);
      return;
    }
    await onEdit(message.id, editContent.trim());
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (confirm("Tem certeza que deseja excluir esta mensagem?")) {
      await onDelete(message.id);
    }
  };

  return (
    <div className={cn("flex flex-col gap-0.5 mb-3 sm:mb-4 group", isOwn ? "items-end" : "items-start")}>
      <div className={cn("flex items-start gap-2 max-w-[85%] sm:max-w-[70%]", isOwn && "flex-row-reverse")}>
        {!isOwn && (
          <UserAvatar
            avatarUrl={message.profiles?.avatar_url}
            fullName={message.profiles?.full_name}
            size="sm"
            className="shrink-0"
          />
        )}
        <div className="flex flex-col gap-0.5 flex-1">
          {!isOwn && (
            <span className="text-xs text-muted-foreground px-2 sm:px-3 truncate">
              {message.profiles?.full_name || "Usuário"}
            </span>
          )}
          <div className="flex items-start gap-1 sm:gap-2">
            {isOwn && onEdit && onDelete && !isEditing && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 sm:h-7 sm:w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  >
                    <MoreVertical className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isOwn ? "end" : "start"}>
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Pencil className="h-4 w-4 mr-2" /> Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                    <Trash className="h-4 w-4 mr-2" /> Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <div className="flex flex-col gap-0.5 flex-1">
              {isEditing ? (
                <div className="flex flex-col gap-2 w-full">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[60px] text-sm"
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                      <X className="h-4 w-4 mr-1" /> Cancelar
                    </Button>
                    <Button size="sm" onClick={handleEdit}>
                      <Check className="h-4 w-4 mr-1" /> Salvar
                    </Button>
                  </div>
                </div>
              ) : isOnlyEmoji(message.content) ? (
                // Sticker - exibir grande sem background
                <>
                  <div className="text-5xl py-1">{message.content}</div>
                  <div className="flex items-center gap-1 px-2 sm:px-3">
                    <span className="text-[10px] sm:text-xs text-muted-foreground">
                      {format(new Date(message.created_at), "HH:mm", { locale: ptBR })}
                    </span>
                    {isOwn && <ReadReceipt message={message} isOwn={isOwn} participants={participants} />}
                  </div>
                </>
              ) : (
                // Mensagem normal com bubble
                <>
                  <div
                    className={cn(
                      "rounded-2xl px-3 sm:px-4 py-2.5 break-words shadow-sm relative",
                      isOwn
                        ? "bg-gradient-to-tr from-primary to-primary/90 text-primary-foreground rounded-tr-sm"
                        : "bg-background border border-border text-foreground rounded-tl-sm"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    {message.edited_at && (
                      <span className="text-[10px] italic opacity-70 mt-1 block text-right">(editado)</span>
                    )}
                  </div>
                  <div className={cn("flex items-center gap-1.5 px-1 mt-1", isOwn ? "justify-end" : "justify-start")}>
                    <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground/80">
                      {format(new Date(message.created_at), "HH:mm", { locale: ptBR })}
                    </span>
                    {isOwn && <ReadReceipt message={message} isOwn={isOwn} participants={participants} />}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
