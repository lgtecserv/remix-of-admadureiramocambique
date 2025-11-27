import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const usePushNotifications = (userId: string | undefined) => {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!("Notification" in window)) {
      toast.error("Este navegador não suporta notificações");
      return false;
    }

    if (!("serviceWorker" in navigator)) {
      toast.error("Service Worker não suportado");
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission === "granted") {
        await subscribeToNotifications();
        return true;
      } else {
        toast.error("Permissão de notificação negada");
        return false;
      }
    } catch (error) {
      console.error("Erro ao solicitar permissão:", error);
      toast.error("Erro ao solicitar permissão de notificação");
      return false;
    }
  };

  const subscribeToNotifications = async () => {
    if (!userId) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Verificar se já existe subscription
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // VAPID public key será configurado no ambiente
        const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        
        if (!vapidPublicKey) {
          console.warn("VAPID public key não configurada");
          return;
        }

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidPublicKey,
        });
      }

      // Salvar subscription no banco
      const subscriptionData = subscription.toJSON();
      
      await supabase.from("push_subscriptions").upsert({
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: subscriptionData.keys?.p256dh || "",
        auth: subscriptionData.keys?.auth || "",
      });

      setIsSubscribed(true);
      toast.success("Notificações push ativadas!");
    } catch (error) {
      console.error("Erro ao inscrever-se em notificações:", error);
      toast.error("Erro ao ativar notificações push");
    }
  };

  const unsubscribe = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        
        // Remover do banco
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", userId)
          .eq("endpoint", subscription.endpoint);

        setIsSubscribed(false);
        toast.success("Notificações push desativadas");
      }
    } catch (error) {
      console.error("Erro ao cancelar inscrição:", error);
      toast.error("Erro ao desativar notificações push");
    }
  };

  return {
    permission,
    isSubscribed,
    requestPermission,
    unsubscribe,
  };
};
