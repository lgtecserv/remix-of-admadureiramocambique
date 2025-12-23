import { useCallback, useRef, useEffect } from "react";
import { NotificationSettings } from "./useNotificationSettings";

// Sons curtos para mensagens (1-2 segundos)
const MESSAGE_SOUNDS: Record<string, string> = {
  "msg-short-1": "/sounds/msg-short-1.mp3",
  "msg-short-2": "/sounds/msg-short-2.mp3",
  "msg-short-3": "/sounds/msg-short-3.mp3",
  "msg-short-4": "/sounds/msg-short-4.mp3",
};

// Som suave para quando está na conversa ativa
const IN_CONVERSATION_SOUNDS: Record<string, string> = {
  "in-conv-soft": "/sounds/in-conv-soft.mp3",
};

// Sons mais longos para alertas gerais
const ALERT_SOUNDS: Record<string, string> = {
  "alert-long-1": "/sounds/alert-long-1.mp3",
  "alert-long-2": "/sounds/alert-long-2.mp3",
  "alert-long-3": "/sounds/alert-long-3.mp3",
  "alert-long-4": "/sounds/alert-long-4.mp3",
  "alert-long-5": "/sounds/alert-long-5.mp3",
};

// Sons antigos (mantidos para compatibilidade)
const LEGACY_SOUNDS: Record<string, string> = {
  "notify-default": "/sounds/notify-default.mp3",
  "notify-digital": "/sounds/notify-digital.mp3",
  "notify-classic": "/sounds/notify-classic.mp3",
  "notify-soft": "/sounds/notify-soft.mp3",
};

// Todos os sons combinados
const ALL_SOUNDS: Record<string, string> = {
  ...MESSAGE_SOUNDS,
  ...IN_CONVERSATION_SOUNDS,
  ...ALERT_SOUNDS,
  ...LEGACY_SOUNDS,
};

// Global audio context to handle autoplay policy
let globalAudioContext: AudioContext | null = null;
let audioUnlocked = false;

// Function to check and log audio status
const getAudioStatus = () => ({
  unlocked: audioUnlocked,
  contextState: globalAudioContext?.state || 'not-created',
});

// Unlock audio context on first user interaction
const unlockAudio = () => {
  if (audioUnlocked) {
    return true;
  }
  
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      return false;
    }
    
    if (!globalAudioContext) {
      globalAudioContext = new AudioContextClass();
    }
    
    if (globalAudioContext.state === 'suspended') {
      globalAudioContext.resume().then(() => {
        audioUnlocked = true;
      }).catch(() => {});
    } else if (globalAudioContext.state === 'running') {
      audioUnlocked = true;
    }
    
    return audioUnlocked;
  } catch (error) {
    return false;
  }
};

// Add event listeners to unlock audio on first interaction
if (typeof window !== 'undefined') {
  const events = ['click', 'touchstart', 'keydown', 'touchend', 'mousedown'];
  const unlockHandler = () => {
    const result = unlockAudio();
    if (result) {
      events.forEach(event => {
        document.removeEventListener(event, unlockHandler);
      });
    }
  };
  events.forEach(event => {
    document.addEventListener(event, unlockHandler, { passive: true });
  });
}

export const useNotificationSound = (settings: NotificationSettings | null) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Preload audio files for faster playback
  useEffect(() => {
    if (settings) {
      // Preload message sound
      if (settings.message_sound_name) {
        const audio = new Audio(ALL_SOUNDS[settings.message_sound_name] || MESSAGE_SOUNDS["msg-short-1"]);
        audio.preload = 'auto';
        audio.load();
      }
      // Preload in-conversation sound
      if (settings.in_conversation_sound_name) {
        const audio = new Audio(ALL_SOUNDS[settings.in_conversation_sound_name] || IN_CONVERSATION_SOUNDS["in-conv-soft"]);
        audio.preload = 'auto';
        audio.load();
      }
      // Preload alert sound
      if (settings.alert_sound_name) {
        const audio = new Audio(ALL_SOUNDS[settings.alert_sound_name] || ALERT_SOUNDS["alert-long-1"]);
        audio.preload = 'auto';
        audio.load();
      }
    }
  }, [settings?.message_sound_name, settings?.in_conversation_sound_name, settings?.alert_sound_name]);

  // Som para mensagens quando NÃO está na conversa ativa
  const playMessageSound = useCallback((isInConversation: boolean = false) => {
    if (!settings?.sound_enabled || !settings?.message_sound_enabled) {
      return;
    }

    try {
      unlockAudio();
      
      let soundFile: string;
      let volume: number;
      
      if (isInConversation) {
        // Som diferente e volume baixo quando está na conversa
        soundFile = ALL_SOUNDS[settings.in_conversation_sound_name] || IN_CONVERSATION_SOUNDS["in-conv-soft"];
        volume = settings.in_conversation_volume || 0.3;
      } else {
        // Som normal de mensagem
        soundFile = ALL_SOUNDS[settings.message_sound_name] || MESSAGE_SOUNDS["msg-short-1"];
        volume = settings.volume;
      }
      
      const audio = new Audio(soundFile);
      audio.volume = volume;
      
      if (globalAudioContext?.state === 'suspended') {
        globalAudioContext.resume();
      }
      
      audio.play().catch(() => {});
    } catch (error) {
      console.error('[Sound] Error playing message sound:', error);
    }
  }, [settings]);

  // Som para notificações gerais (patrimônio, etc) - sons mais longos
  const playNotificationSound = useCallback(() => {
    if (!settings?.sound_enabled || !settings?.notification_sound_enabled) {
      return;
    }

    try {
      unlockAudio();
      
      const soundFile = ALL_SOUNDS[settings.alert_sound_name] || ALERT_SOUNDS["alert-long-1"];
      
      const audio = new Audio(soundFile);
      audio.volume = settings.volume;
      
      if (globalAudioContext?.state === 'suspended') {
        globalAudioContext.resume();
      }
      
      audio.play().catch(() => {});
    } catch (error) {
      console.error('[Sound] Error playing notification sound:', error);
    }
  }, [settings]);

  const playPreview = useCallback((soundName: string, customVolume?: number) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const audio = new Audio(ALL_SOUNDS[soundName] || MESSAGE_SOUNDS["msg-short-1"]);
      audio.volume = customVolume ?? settings?.volume ?? 0.7;
      audioRef.current = audio;
      
      audio.play().catch(() => {});
    } catch (error) {
      console.error('[Sound] Error playing preview sound:', error);
    }
  }, [settings?.volume]);

  const playBirthdaySound = useCallback(() => {
    if (!settings?.sound_enabled) {
      return;
    }

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const audioContext = new AudioContextClass();
      
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      const notes = [
        { freq: 264, duration: 0.2 },
        { freq: 264, duration: 0.2 },
        { freq: 297, duration: 0.4 },
        { freq: 264, duration: 0.4 },
        { freq: 352, duration: 0.4 },
        { freq: 330, duration: 0.6 },
      ];

      let time = audioContext.currentTime;
      notes.forEach((note) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = "sine";
        oscillator.frequency.value = note.freq;
        gainNode.gain.value = (settings?.volume || 0.7) * 0.3;
        
        gainNode.gain.setValueAtTime((settings?.volume || 0.7) * 0.3, time);
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + note.duration);
        
        oscillator.start(time);
        oscillator.stop(time + note.duration);
        time += note.duration;
      });
    } catch (error) {
      console.error('[Sound] Error playing birthday sound:', error);
    }
  }, [settings?.sound_enabled, settings?.volume]);

  return { playMessageSound, playNotificationSound, playPreview, playBirthdaySound };
};

// Opções de som para mensagens (curtos)
export const MESSAGE_SOUND_OPTIONS = [
  { value: "msg-short-1", label: "WhatsApp 1" },
  { value: "msg-short-2", label: "WhatsApp 2" },
  { value: "msg-short-3", label: "WhatsApp 3" },
  { value: "msg-short-4", label: "SMS" },
];

// Opções de som para quando está na conversa
export const IN_CONVERSATION_SOUND_OPTIONS = [
  { value: "in-conv-soft", label: "Suave" },
];

// Opções de som para alertas gerais (longos)
export const ALERT_SOUND_OPTIONS = [
  { value: "alert-long-1", label: "Notificação 1" },
  { value: "alert-long-2", label: "Notificação 2" },
  { value: "alert-long-3", label: "Notificação 3" },
  { value: "alert-long-4", label: "Notificação 4" },
  { value: "alert-long-5", label: "Notificação 5" },
];

// Mantido para compatibilidade com código existente
export const SOUND_OPTIONS = MESSAGE_SOUND_OPTIONS;
