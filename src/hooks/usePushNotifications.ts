import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const usePushNotifications = (userId: string | undefined) => {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);

  // Fetch VAPID public key from edge function
  const fetchVapidKey = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-vapid-public-key');
      
      if (error) {
        console.error("Error fetching VAPID key:", error);
        return null;
      }
      
      if (data?.publicKey) {
        setVapidPublicKey(data.publicKey);
        return data.publicKey;
      }
      
      return null;
    } catch (error) {
      console.error("Error fetching VAPID key:", error);
      return null;
    }
  }, []);

  // Check initial state
  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
    
    // Check if already subscribed
    const checkSubscription = async () => {
      if (!("serviceWorker" in navigator) || !userId) return;
      
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
          // Verify subscription exists in database
          const { data } = await supabase
            .from("push_subscriptions")
            .select("id")
            .eq("user_id", userId)
            .eq("endpoint", subscription.endpoint)
            .single();
          
          setIsSubscribed(!!data);
        }
      } catch (error) {
        console.error("Error checking subscription:", error);
      }
    };
    
    checkSubscription();
    fetchVapidKey();
  }, [userId, fetchVapidKey]);

  const requestPermission = async (): Promise<boolean> => {
    if (!("Notification" in window)) {
      toast.error("Este navegador não suporta notificações");
      return false;
    }

    if (!("serviceWorker" in navigator)) {
      toast.error("Service Worker não suportado");
      return false;
    }

    if (!userId) {
      toast.error("Usuário não autenticado");
      return false;
    }

    setLoading(true);

    try {
      // First ensure we have the VAPID key
      let key = vapidPublicKey;
      if (!key) {
        key = await fetchVapidKey();
        if (!key) {
          toast.error("Configuração de notificações não disponível");
          return false;
        }
      }

      const notificationPermission = await Notification.requestPermission();
      setPermission(notificationPermission);

      if (notificationPermission === "granted") {
        const success = await subscribeToNotifications(key);
        return success;
      } else if (notificationPermission === "denied") {
        toast.error("Você bloqueou as notificações. Desbloqueie nas configurações do navegador.");
        return false;
      } else {
        toast.info("Permissão não concedida");
        return false;
      }
    } catch (error) {
      console.error("Erro ao solicitar permissão:", error);
      toast.error("Erro ao solicitar permissão de notificação");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNotifications = async (publicKey: string): Promise<boolean> => {
    if (!userId) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Check if already subscribed
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // Convert VAPID key to Uint8Array
        const urlBase64ToUint8Array = (base64String: string) => {
          const padding = '='.repeat((4 - base64String.length % 4) % 4);
          const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');
          
          const rawData = window.atob(base64);
          const outputArray = new Uint8Array(rawData.length);
          
          for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
          }
          return outputArray;
        };

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      // Save subscription to database
      const subscriptionData = subscription.toJSON();
      
      const { error } = await supabase.from("push_subscriptions").upsert({
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: subscriptionData.keys?.p256dh || "",
        auth: subscriptionData.keys?.auth || "",
      }, {
        onConflict: 'user_id,endpoint'
      });

      if (error) {
        console.error("Error saving subscription:", error);
        // Try insert if upsert fails
        await supabase.from("push_subscriptions").insert({
          user_id: userId,
          endpoint: subscription.endpoint,
          p256dh: subscriptionData.keys?.p256dh || "",
          auth: subscriptionData.keys?.auth || "",
        });
      }

      setIsSubscribed(true);
      toast.success("Notificações push ativadas!");
      return true;
    } catch (error) {
      console.error("Erro ao inscrever-se em notificações:", error);
      toast.error("Erro ao ativar notificações push");
      return false;
    }
  };

  const unsubscribe = async (): Promise<void> => {
    if (!userId) return;
    
    setLoading(true);
    
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        
        // Remove from database
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", userId)
          .eq("endpoint", subscription.endpoint);
      }

      setIsSubscribed(false);
      toast.success("Notificações push desativadas");
    } catch (error) {
      console.error("Erro ao cancelar inscrição:", error);
      toast.error("Erro ao desativar notificações push");
    } finally {
      setLoading(false);
    }
  };

  const retryPermission = async (): Promise<void> => {
    // Force refresh permission state
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  };

  return {
    permission,
    isSubscribed,
    loading,
    requestPermission,
    unsubscribe,
    retryPermission,
  };
};
