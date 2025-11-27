import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

export const usePresence = (userId: string | undefined, conversationId: string | null) => {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!conversationId || !userId) {
      setOnlineUsers(new Set());
      return;
    }

    const presenceChannel = supabase.channel(`presence-${conversationId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        const online = new Set<string>();
        
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            if (presence.user_id) {
              online.add(presence.user_id);
            }
          });
        });
        
        setOnlineUsers(online);
      })
      .on("presence", { event: "join" }, ({ newPresences }) => {
        newPresences.forEach((presence: any) => {
          if (presence.user_id) {
            setOnlineUsers((prev) => new Set([...prev, presence.user_id]));
          }
        });
      })
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        leftPresences.forEach((presence: any) => {
          if (presence.user_id) {
            setOnlineUsers((prev) => {
              const next = new Set(prev);
              next.delete(presence.user_id);
              return next;
            });
          }
        });
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          });
        }
      });

    setChannel(presenceChannel);

    return () => {
      if (presenceChannel) {
        presenceChannel.untrack();
        supabase.removeChannel(presenceChannel);
      }
    };
  }, [conversationId, userId]);

  const isOnline = (uid: string) => onlineUsers.has(uid);

  return { onlineUsers, isOnline };
};
