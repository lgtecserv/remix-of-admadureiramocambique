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

    console.log("[Global Message Notifications] Setting up listener for user:", userId);

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
          
          console.log("[Global Message Notifications] New message received:", {
            messageId: newMessage.id,
            senderId: newMessage.sender_id,
            conversationId: newMessage.conversation_id,
            currentUserId: userId,
            activeConversationId,
          });

          // Só toca som se:
          // 1. A mensagem não é do próprio usuário
          // 2. A conversa NÃO está atualmente aberta/ativa
          // 3. Ainda não foi notificado sobre esta mensagem
          const shouldPlaySound = 
            newMessage.sender_id !== userId && 
            newMessage.conversation_id !== activeConversationId &&
            !notifiedMessageIds.current.has(newMessage.id);

          if (shouldPlaySound) {
            console.log("[Global Message Notifications] Playing sound for message:", newMessage.id);
            notifiedMessageIds.current.add(newMessage.id);
            playMessageSound();
          } else {
            console.log("[Global Message Notifications] Skipping sound:", {
              isOwnMessage: newMessage.sender_id === userId,
              isActiveConversation: newMessage.conversation_id === activeConversationId,
              alreadyNotified: notifiedMessageIds.current.has(newMessage.id),
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log("[Global Message Notifications] Cleaning up listener");
      supabase.removeChannel(channel);
    };
  }, [userId, activeConversationId, playMessageSound]);
};
