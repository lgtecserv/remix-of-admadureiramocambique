import { useCallback, useRef } from "react";
import { NotificationSettings } from "./useNotificationSettings";

const SOUNDS: Record<string, string> = {
  "notify-default": "/sounds/notify-default.mp3",
  "notify-digital": "/sounds/notify-digital.mp3",
  "notify-classic": "/sounds/notify-classic.mp3",
  "notify-soft": "/sounds/notify-soft.mp3",
};

export const useNotificationSound = (settings: NotificationSettings | null) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playMessageSound = useCallback(() => {
    if (!settings?.sound_enabled || !settings?.message_sound_enabled) return;

    try {
      const audio = new Audio(SOUNDS[settings.sound_name] || SOUNDS["notify-default"]);
      audio.volume = settings.volume;
      audio.play().catch((error) => {
        console.error("Error playing message sound:", error);
      });
    } catch (error) {
      console.error("Error creating audio:", error);
    }
  }, [settings]);

  const playNotificationSound = useCallback(() => {
    if (!settings?.sound_enabled || !settings?.notification_sound_enabled) return;

    try {
      const audio = new Audio(SOUNDS[settings.sound_name] || SOUNDS["notify-default"]);
      audio.volume = settings.volume;
      audio.play().catch((error) => {
        console.error("Error playing notification sound:", error);
      });
    } catch (error) {
      console.error("Error creating audio:", error);
    }
  }, [settings]);

  const playPreview = useCallback((soundName: string) => {
    try {
      // Stop previous preview if playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const audio = new Audio(SOUNDS[soundName] || SOUNDS["notify-default"]);
      audio.volume = settings?.volume || 0.7;
      audioRef.current = audio;
      
      audio.play().catch((error) => {
        console.error("Error playing preview sound:", error);
      });
    } catch (error) {
      console.error("Error creating preview audio:", error);
    }
  }, [settings?.volume]);

  return { playMessageSound, playNotificationSound, playPreview };
};

export const SOUND_OPTIONS = [
  { value: "notify-default", label: "Padrão" },
  { value: "notify-digital", label: "Digital" },
  { value: "notify-classic", label: "Clássico" },
  { value: "notify-soft", label: "Suave" },
];
