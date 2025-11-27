import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface NotificationSettings {
  id: string;
  user_id: string;
  sound_enabled: boolean;
  sound_name: string;
  message_sound_enabled: boolean;
  notification_sound_enabled: boolean;
  volume: number;
}

export const useNotificationSettings = (userId: string | undefined) => {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
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
        setSettings(data);
      } else {
        // Create default settings if none exist
        await createDefaultSettings();
      }
    } catch (error) {
      console.error("Error in loadSettings:", error);
    } finally {
      setLoading(false);
    }
  };

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
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating default settings:", error);
        return;
      }

      setSettings(data);
    } catch (error) {
      console.error("Error in createDefaultSettings:", error);
    }
  };

  const updateSettings = async (updates: Partial<NotificationSettings>) => {
    if (!userId || !settings) return;

    try {
      const { data, error } = await supabase
        .from("user_notification_settings")
        .update(updates)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) {
        console.error("Error updating settings:", error);
        return;
      }

      setSettings(data);
    } catch (error) {
      console.error("Error in updateSettings:", error);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [userId]);

  return { settings, updateSettings, loading };
};
