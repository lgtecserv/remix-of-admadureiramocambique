import { useCallback, useRef } from "react";
import { useNotificationSettings } from "./useNotificationSettings";
import { useNotificationSound } from "./useNotificationSound";

export const useChatNotificationSound = (userId: string | undefined) => {
  const { settings } = useNotificationSettings(userId);
  const { playMessageSound } = useNotificationSound(settings);
  const lastMessageIdRef = useRef<string | null>(null);

  const notifyNewMessage = useCallback((messageId: string, senderId: string) => {
    // Só toca se a mensagem é de outro usuário e é uma nova mensagem
    if (senderId !== userId && messageId !== lastMessageIdRef.current) {
      lastMessageIdRef.current = messageId;
      playMessageSound();
    }
  }, [userId, playMessageSound]);

  return { notifyNewMessage };
};
