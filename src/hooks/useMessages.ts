import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  edited_at: string | null;
  is_deleted: boolean;
  read_by: string[] | null;
  delivered_to: string[] | null;
  profiles: {
    full_name: string;
    email: string;
  };
}

export const useMessages = (conversationId: string | null, userId: string | undefined) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMessages = async () => {
    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          profiles (
            full_name,
            email
          )
        `)
        .eq("conversation_id", conversationId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("Error loading messages:", error);
      toast.error("Erro ao carregar mensagens");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();

    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          // TODO: Re-enable notification sound after build stabilizes
          loadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const sendMessage = async (content: string) => {
    if (!conversationId || !userId || !content.trim()) return;

    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: userId,
        content: content.trim(),
      });

      if (error) throw error;
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Erro ao enviar mensagem");
    }
  };

  const editMessage = async (messageId: string, newContent: string) => {
    if (!userId || !newContent.trim()) return;

    try {
      const { error } = await supabase
        .from("messages")
        .update({ 
          content: newContent.trim(), 
          edited_at: new Date().toISOString() 
        })
        .eq("id", messageId)
        .eq("sender_id", userId);

      if (error) throw error;
      toast.success("Mensagem editada");
    } catch (error) {
      console.error("Error editing message:", error);
      toast.error("Erro ao editar mensagem");
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from("messages")
        .update({ is_deleted: true })
        .eq("id", messageId)
        .eq("sender_id", userId);

      if (error) throw error;
      toast.success("Mensagem excluída");
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error("Erro ao excluir mensagem");
    }
  };

  const markAsDelivered = async () => {
    if (!conversationId || !userId) return;
    
    // Buscar mensagens não entregues para este usuário
    const undeliveredMessages = messages.filter(
      m => m.sender_id !== userId && 
      !(m.delivered_to || []).includes(userId)
    );
    
    // Marcar cada uma como entregue
    for (const msg of undeliveredMessages) {
      try {
        await supabase.rpc('mark_message_delivered', { msg_id: msg.id });
      } catch (error) {
        console.error("Error marking message as delivered:", error);
      }
    }
  };

  // Marcar mensagens como entregues quando carregam
  useEffect(() => {
    if (messages.length > 0 && userId) {
      markAsDelivered();
    }
  }, [messages.length, userId]);

  return {
    messages,
    loading,
    sendMessage,
    editMessage,
    deleteMessage,
    refresh: loadMessages,
  };
};
