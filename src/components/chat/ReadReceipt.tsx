import { Check, CheckCheck } from "lucide-react";
import { Message } from "@/hooks/useMessages";

interface ReadReceiptProps {
  message: Message;
  isOwn: boolean;
  participants?: Array<{ user_id: string }>;
}

const ReadReceipt = ({ message, isOwn, participants = [] }: ReadReceiptProps) => {
  if (!isOwn) return null;

  const readBy = message.read_by || [];
  const deliveredTo = message.delivered_to || [];
  const otherParticipants = participants.filter((p) => p.user_id !== message.sender_id);
  
  // Verificar se todos leram
  const readByAll = otherParticipants.length === 0 || 
    otherParticipants.every((p) => readBy.includes(p.user_id));
  
  // Verificar se todos receberam
  const deliveredToAll = otherParticipants.length === 0 ||
    otherParticipants.every((p) => deliveredTo.includes(p.user_id));

  // Estados:
  // 1. ✓ cinza = Enviado (não entregue ainda)
  // 2. ✓✓ cinza = Entregue (mas não lido)
  // 3. ✓✓ azul = Lido

  if (readByAll) {
    // ✓✓ Azul - Lido
    return <CheckCheck className="h-3 w-3 text-blue-500" aria-label="Lido" />;
  }
  
  if (deliveredToAll) {
    // ✓✓ Cinza - Entregue
    return <CheckCheck className="h-3 w-3 text-muted-foreground" aria-label="Entregue" />;
  }
  
  // ✓ Cinza - Apenas enviado
  return <Check className="h-3 w-3 text-muted-foreground" aria-label="Enviado" />;
};

export default ReadReceipt;
