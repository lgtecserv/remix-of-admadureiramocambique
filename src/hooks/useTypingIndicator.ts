import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TypingUser {
  user_id: string;
  full_name: string;
}

export const useTypingIndicator = (conversationId: string | null, userId: string | undefined) => {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  let typingTimeout: NodeJS.Timeout | null = null;

  const setTyping = useCallback(async (isTyping: boolean) => {
    if (!conversationId || !userId) return;

    if (typingTimeout) {
      clearTimeout(typingTimeout);
      typingTimeout = null;
    }

    try {
      await supabase.from("typing_indicators").upsert({
        conversation_id: conversationId,
        user_id: userId,
        is_typing: isTyping,
        updated_at: new Date().toISOString(),
      });

      // Auto-remover depois de 3 segundos se não houver nova atualização
      if (isTyping) {
        typingTimeout = setTimeout(() => {
          supabase.from("typing_indicators").upsert({
            conversation_id: conversationId,
            user_id: userId,
            is_typing: false,
            updated_at: new Date().toISOString(),
          });
        }, 3000);
      }
    } catch (error) {
      console.error("Error updating typing indicator:", error);
    }
  }, [conversationId, userId]);

  useEffect(() => {
    if (!conversationId) {
      setTypingUsers([]);
      return;
    }

    // Carregar estado inicial
    const loadTypingUsers = async () => {
      const { data, error } = await supabase
        .from("typing_indicators")
        .select(`
          user_id,
          is_typing,
          profiles (
            full_name
          )
        `)
        .eq("conversation_id", conversationId)
        .eq("is_typing", true);

      if (error) {
        console.error("Error loading typing users:", error);
        return;
      }

      const users = data
        .filter((item: any) => item.user_id !== userId && item.profiles)
        .map((item: any) => ({
          user_id: item.user_id,
          full_name: item.profiles.full_name,
        }));

      setTypingUsers(users);
    };

    loadTypingUsers();

    // Escutar mudanças em tempo real
    const channel = supabase
      .channel(`typing-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "typing_indicators",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          loadTypingUsers();
        }
      )
      .subscribe();

    return () => {
      // Marcar como não digitando ao sair
      if (conversationId && userId) {
        supabase.from("typing_indicators").upsert({
          conversation_id: conversationId,
          user_id: userId,
          is_typing: false,
          updated_at: new Date().toISOString(),
        });
      }
      supabase.removeChannel(channel);
      if (typingTimeout) clearTimeout(typingTimeout);
    };
  }, [conversationId, userId]);

  return { typingUsers, setTyping };
};
