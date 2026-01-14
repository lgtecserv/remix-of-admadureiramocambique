import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { offlineDB, OfflineMessage } from "@/lib/offlineDB";
import { queueAction } from "@/lib/syncQueue";
import { useNetworkStatus } from "./useNetworkStatus";

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
    avatar_url?: string | null;
  };
}

export const useMessages = (conversationId: string | null, userId: string | undefined) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const { isOnline, updatePendingCount } = useNetworkStatus();

  // Carregar perfil do usuário atual para uso offline
  const [userProfile, setUserProfile] = useState<{
    full_name: string;
    email: string;
    avatar_url: string | null;
  } | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!userId) return;
      
      try {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, email, avatar_url')
          .eq('id', userId)
          .single();
        
        if (data) {
          setUserProfile(data);
          // Salvar no cache
          await offlineDB.profiles.put({
            id: userId,
            full_name: data.full_name,
            email: data.email,
            avatar_url: data.avatar_url,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      } catch (error) {
        // Tentar carregar do cache
        const cached = await offlineDB.profiles.get(userId);
        if (cached) {
          setUserProfile({
            full_name: cached.full_name,
            email: cached.email || '',
            avatar_url: cached.avatar_url || null
          });
        }
      }
    };
    
    loadProfile();
  }, [userId]);

  const loadMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      if (isOnline) {
        // Buscar do Supabase
        const { data, error } = await supabase
          .from("messages")
          .select(`
            *,
            profiles (
              full_name,
              email,
              avatar_url
            )
          `)
          .eq("conversation_id", conversationId)
          .eq("is_deleted", false)
          .order("created_at", { ascending: true });

        if (error) throw error;
        
        // Salvar no cache local
        if (data && data.length > 0) {
          const offlineMessages: OfflineMessage[] = data.map(msg => ({
            id: msg.id,
            conversation_id: msg.conversation_id,
            sender_id: msg.sender_id,
            content: msg.content,
            created_at: msg.created_at,
            edited_at: msg.edited_at,
            is_deleted: msg.is_deleted || false,
            read_by: msg.read_by,
            delivered_to: msg.delivered_to,
            sender_name: msg.profiles?.full_name,
            sender_email: msg.profiles?.email,
            sender_avatar: msg.profiles?.avatar_url,
            is_synced: true
          }));
          
          await offlineDB.messages.bulkPut(offlineMessages);
        }
        
        setMessages(data || []);
      } else {
        // Buscar do IndexedDB quando offline
        const cachedMessages = await offlineDB.messages
          .where('conversation_id')
          .equals(conversationId)
          .filter(msg => !msg.is_deleted)
          .sortBy('created_at');

        // Converter para formato esperado
        const formattedMessages: Message[] = cachedMessages.map(msg => ({
          id: msg.id,
          conversation_id: msg.conversation_id,
          sender_id: msg.sender_id,
          content: msg.content,
          created_at: msg.created_at,
          edited_at: msg.edited_at || null,
          is_deleted: msg.is_deleted,
          read_by: msg.read_by || null,
          delivered_to: msg.delivered_to || null,
          profiles: {
            full_name: msg.sender_name || 'Usuário',
            email: msg.sender_email || '',
            avatar_url: msg.sender_avatar
          }
        }));

        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
      
      // Fallback para cache local
      try {
        const cachedMessages = await offlineDB.messages
          .where('conversation_id')
          .equals(conversationId)
          .filter(msg => !msg.is_deleted)
          .sortBy('created_at');

        const formattedMessages: Message[] = cachedMessages.map(msg => ({
          id: msg.id,
          conversation_id: msg.conversation_id,
          sender_id: msg.sender_id,
          content: msg.content,
          created_at: msg.created_at,
          edited_at: msg.edited_at || null,
          is_deleted: msg.is_deleted,
          read_by: msg.read_by || null,
          delivered_to: msg.delivered_to || null,
          profiles: {
            full_name: msg.sender_name || 'Usuário',
            email: msg.sender_email || '',
            avatar_url: msg.sender_avatar
          }
        }));

        setMessages(formattedMessages);
        
        if (isOnline) {
          toast.error("Erro ao carregar mensagens");
        }
      } catch (cacheError) {
        console.error("Cache error:", cacheError);
        toast.error("Erro ao carregar mensagens");
      }
    } finally {
      setLoading(false);
    }
  }, [conversationId, isOnline]);

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
          loadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, loadMessages]);

  const sendMessage = async (content: string) => {
    if (!conversationId || !userId || !content.trim()) return;

    const messageId = crypto.randomUUID();
    const now = new Date().toISOString();
    const trimmedContent = content.trim();

    // Criar objeto da mensagem
    const newMessage: OfflineMessage = {
      id: messageId,
      conversation_id: conversationId,
      sender_id: userId,
      content: trimmedContent,
      created_at: now,
      is_deleted: false,
      sender_name: userProfile?.full_name || 'Você',
      sender_email: userProfile?.email || '',
      sender_avatar: userProfile?.avatar_url,
      is_synced: isOnline
    };

    // Salvar localmente primeiro (optimistic update)
    await offlineDB.messages.add(newMessage);

    // Adicionar à lista de mensagens imediatamente
    const displayMessage: Message = {
      id: messageId,
      conversation_id: conversationId,
      sender_id: userId,
      content: trimmedContent,
      created_at: now,
      edited_at: null,
      is_deleted: false,
      read_by: null,
      delivered_to: null,
      profiles: {
        full_name: userProfile?.full_name || 'Você',
        email: userProfile?.email || '',
        avatar_url: userProfile?.avatar_url
      }
    };

    setMessages(prev => [...prev, displayMessage]);

    if (isOnline) {
      try {
        const { error } = await supabase.from("messages").insert({
          id: messageId,
          conversation_id: conversationId,
          sender_id: userId,
          content: trimmedContent,
        });

        if (error) throw error;

        // Marcar como sincronizado
        await offlineDB.messages.update(messageId, { is_synced: true });
      } catch (error) {
        console.error("Error sending message:", error);
        toast.error("Erro ao enviar mensagem");
        
        // Adicionar à fila de sincronização
        await queueAction({
          type: 'INSERT',
          table: 'messages',
          data: {
            id: messageId,
            conversation_id: conversationId,
            sender_id: userId,
            content: trimmedContent,
          }
        });
        await updatePendingCount();
      }
    } else {
      // Offline: adicionar à fila de sincronização
      await queueAction({
        type: 'INSERT',
        table: 'messages',
        data: {
          id: messageId,
          conversation_id: conversationId,
          sender_id: userId,
          content: trimmedContent,
        }
      });
      await updatePendingCount();
      
      toast.info("Mensagem será enviada quando a conexão voltar");
      
      // Tentar registrar background sync
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          // @ts-ignore - Background Sync API não está em todos os browsers
          if (registration.sync) {
            // @ts-ignore
            await registration.sync.register('sync-pending-actions');
          }
        } catch (syncError) {
          console.log('Background Sync não suportado:', syncError);
        }
      }
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
      
      // Atualizar localmente também
      await offlineDB.messages.update(messageId, { is_deleted: true });
      
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
    if (messages.length > 0 && userId && isOnline) {
      markAsDelivered();
    }
  }, [messages.length, userId, isOnline]);

  return {
    messages,
    loading,
    sendMessage,
    editMessage,
    deleteMessage,
    refresh: loadMessages,
    isOnline,
  };
};
