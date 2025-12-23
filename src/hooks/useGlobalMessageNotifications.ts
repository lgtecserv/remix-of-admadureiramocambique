import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useActiveConversation } from "@/contexts/ActiveConversationContext";
import { useNotificationSettings } from "./useNotificationSettings";
import { useNotificationSound } from "./useNotificationSound";

export const useGlobalMessageNotifications = (userId: string | undefined) => {
  const { activeConversationId } = useActiveConversation();
  const { settings } = useNotificationSettings(userId);
  const { playMessageSound } = useNotificationSound(settings);
  const notifiedMessageIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`global-messages-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMessage = payload.new as any;
          
          // Não toca som para mensagens do próprio usuário
          if (newMessage.sender_id === userId) {
            return;
          }
          
          // Verifica se já notificou essa mensagem
          if (notifiedMessageIds.current.has(newMessage.id)) {
            return;
          }
          
          notifiedMessageIds.current.add(newMessage.id);
          
          // Se a conversa está ativa, toca som suave e baixo
          // Se não está ativa, toca som normal de mensagem
          const isInActiveConversation = newMessage.conversation_id === activeConversationId;
          
          playMessageSound(isInActiveConversation);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, activeConversationId, playMessageSound]);
};
