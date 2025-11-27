import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Conversation {
  id: string;
  type: "general" | "private";
  name: string | null;
  created_at: string;
  updated_at: string;
  participants?: ConversationParticipant[];
  lastMessage?: {
    content: string;
    created_at: string;
  };
  unreadCount?: number;
}

export interface ConversationParticipant {
  id: string;
  user_id: string;
  last_read_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

export const useConversations = (userId: string | undefined) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadConversations = async () => {
    if (!userId) return;

    try {
      const { data: participantData, error } = await supabase
        .from("conversation_participants")
        .select(`
          conversation_id,
          last_read_at,
          conversations (
            id,
            type,
            name,
            created_at,
            updated_at
          )
        `)
        .eq("user_id", userId);

      if (error) throw error;

      const convIds = participantData?.map((p: any) => p.conversation_id) || [];
      
      if (convIds.length === 0) {
        setConversations([]);
        return;
      }

      // Get last message and participants for each conversation
      const conversationsWithDetails = await Promise.all(
        participantData.map(async (p: any) => {
          const conv = p.conversations;
          
          // Get last message
          const { data: lastMsg } = await supabase
            .from("messages")
            .select("content, created_at")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          // Get all participants
          const { data: participants } = await supabase
            .from("conversation_participants")
            .select(`
              id,
              user_id,
              last_read_at,
              profiles (
                full_name,
                email
              )
            `)
            .eq("conversation_id", conv.id);

          // Get unread count
          const { count } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", conv.id)
            .eq("is_deleted", false)
            .gt("created_at", p.last_read_at);

          return {
            ...conv,
            participants,
            lastMessage: lastMsg || undefined,
            unreadCount: count || 0,
          };
        })
      );

      // Sort by last message date
      conversationsWithDetails.sort((a, b) => {
        const aDate = a.lastMessage?.created_at || a.created_at;
        const bDate = b.lastMessage?.created_at || b.created_at;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });

      setConversations(conversationsWithDetails);
    } catch (error) {
      console.error("Error loading conversations:", error);
      toast.error("Erro ao carregar conversas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();

    const channel = supabase
      .channel("conversations-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => loadConversations()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversation_participants" },
        () => loadConversations()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => loadConversations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const createPrivateConversation = async (otherUserId: string) => {
    try {
      const { data, error } = await supabase.rpc("create_private_conversation", {
        other_user_id: otherUserId,
      });

      if (error) throw error;

      await loadConversations();
      return data;
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast.error("Erro ao criar conversa");
      return null;
    }
  };

  const markAsRead = async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from("conversation_participants")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .eq("user_id", userId!);

      if (error) throw error;
      await loadConversations();
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  return {
    conversations,
    loading,
    createPrivateConversation,
    markAsRead,
    refresh: loadConversations,
  };
};
