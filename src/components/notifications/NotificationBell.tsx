import { useEffect, useState, useRef } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNotificationSettings } from "@/hooks/useNotificationSettings";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { useActiveConversation } from "@/contexts/ActiveConversationContext";

interface NotificationMetadata {
  conversation_id?: string;
  [key: string]: unknown;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  link: string | null;
  metadata?: NotificationMetadata | null;
}

const NotificationBell = ({ userId }: { userId: string }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifiedIdsRef = useRef<Set<string>>(new Set());
  const { settings } = useNotificationSettings(userId);
  const { playNotificationSound, playMessageSound } = useNotificationSound(settings);
  const { activeConversationId } = useActiveConversation();
  
  // Ref para acessar valor atual sem recriar subscription
  const activeConversationIdRef = useRef(activeConversationId);
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  // Carregar notificações existentes ao montar
  useEffect(() => {
    loadNotifications();
  }, [userId]);

  // Subscription realtime separada com dependências mínimas
  useEffect(() => {
    if (!userId) return;

    console.log("[NotificationBell] Setting up realtime subscription for user:", userId);

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        { 
          event: "INSERT", 
          schema: "public", 
          table: "notifications", 
          filter: `user_id=eq.${userId}` 
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          
          console.log("[NotificationBell] New notification received:", newNotification);
          
          // Só toca som se não foi notificado ainda
          if (!notifiedIdsRef.current.has(newNotification.id)) {
            notifiedIdsRef.current.add(newNotification.id);
            
            // Verificar se é notificação de mensagem e se está na conversa ativa
            const isMessageNotification = newNotification.type === "message";
            const notificationConversationId = newNotification.metadata?.conversation_id;
            const isActiveConversation = notificationConversationId === activeConversationIdRef.current;
            
            // Lógica correta de som baseada no tipo de notificação
            if (isMessageNotification) {
              // Para mensagens: toca som apenas se NÃO estiver na conversa ativa
              if (!isActiveConversation) {
                console.log("[NotificationBell] Playing message sound");
                playMessageSound();
              } else {
                console.log("[NotificationBell] Skipping sound - user is in active conversation");
              }
            } else {
              // Para outras notificações (warning, info, etc.): sempre toca som
              console.log("[NotificationBell] Playing notification sound for type:", newNotification.type);
              playNotificationSound();
            }
            
            loadNotifications();
          } else {
            console.log("[NotificationBell] Notification already handled:", newNotification.id);
          }
        }
      )
      .subscribe();

    return () => {
      console.log("[NotificationBell] Cleaning up subscription");
      supabase.removeChannel(channel);
    };
  }, [userId, playNotificationSound]);

  const loadNotifications = async () => {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!error && data) {
      setNotifications(data as unknown as Notification[]);
      setUnreadCount(data.filter((n) => !n.read).length);
    }
  };

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    loadNotifications();
  };

  const markAllAsRead = async () => {
    await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
    loadNotifications();
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      info: "bg-blue-500",
      success: "bg-green-500",
      warning: "bg-yellow-500",
      error: "bg-red-500",
      message: "bg-purple-500",
    };
    return colors[type] || colors.info;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-2rem)] sm:w-80 max-w-sm" align="end">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Notificações</h3>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                Marcar todas como lidas
              </Button>
            )}
          </div>
          <ScrollArea className="h-[300px]">
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma notificação</p>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg border cursor-pointer hover:bg-accent ${
                      !notification.read ? "bg-accent/50" : ""
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`w-2 h-2 rounded-full mt-1.5 ${getTypeColor(notification.type)}`} />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">{notification.title}</p>
                        <p className="text-xs text-muted-foreground">{notification.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(notification.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
