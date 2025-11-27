import { CheckCheck } from "lucide-react";
import { Message } from "@/hooks/useMessages";

interface ReadReceiptProps {
  message: Message;
  isOwn: boolean;
  participants?: Array<{ user_id: string }>;
}

const ReadReceipt = ({ message, isOwn, participants = [] }: ReadReceiptProps) => {
  if (!isOwn) return null;

  const readBy = message.read_by || [];
  const otherParticipants = participants.filter((p) => p.user_id !== message.sender_id);
  
  const readByAll = otherParticipants.length === 0 || 
    otherParticipants.every((p) => readBy.includes(p.user_id));

  return (
    <CheckCheck
      className={`h-3 w-3 ${readByAll ? "text-blue-500" : "text-muted-foreground"}`}
      aria-label={readByAll ? "Lido" : "Enviado"}
    />
  );
};

export default ReadReceipt;
