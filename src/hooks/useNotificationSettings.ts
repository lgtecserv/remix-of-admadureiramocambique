import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface NotificationSettings {
  id: string;
  user_id: string;
  sound_enabled: boolean;
  sound_name: string;
  message_sound_enabled: boolean;
  notification_sound_enabled: boolean;
  volume: number;
  // Novos campos para separação de sons
  message_sound_name: string;
  in_conversation_sound_name: string;
  in_conversation_volume: number;
  alert_sound_name: string;
}

export const useNotificationSettings = (userId: string | undefined) => {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_notification_settings")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading notification settings:", error);
        return;
      }

      if (data) {
        setSettings(data as NotificationSettings);
      } else {
        // Create default settings if none exist
        await createDefaultSettings();
      }
    } catch (error) {
      console.error("Error in loadSettings:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const createDefaultSettings = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("user_notification_settings")
        .insert({
          user_id: userId,
          sound_enabled: true,
          sound_name: "notify-default",
          message_sound_enabled: true,
          notification_sound_enabled: true,
          volume: 0.7,
          message_sound_name: "msg-short-1",
          in_conversation_sound_name: "in-conv-soft",
          in_conversation_volume: 0.3,
          alert_sound_name: "alert-long-1",
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating default settings:", error);
        return;
      }

      setSettings(data as NotificationSettings);
    } catch (error) {
      console.error("Error in createDefaultSettings:", error);
    }
  };

  const updateSettings = async (updates: Partial<NotificationSettings>) => {
    if (!userId || !settings) return false;

    try {
      const { data, error } = await supabase
        .from("user_notification_settings")
        .update(updates)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) {
        console.error("Error updating settings:", error);
        return false;
      }

      setSettings(data as NotificationSettings);
      return true;
    } catch (error) {
      console.error("Error in updateSettings:", error);
      return false;
    }
  };

  // Atualiza estado local sem salvar no banco (para uso com botão salvar)
  const setLocalSettings = useCallback((updates: Partial<NotificationSettings>) => {
    setSettings(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return { settings, updateSettings, setLocalSettings, loading, reloadSettings: loadSettings };
};
