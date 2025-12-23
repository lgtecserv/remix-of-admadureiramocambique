import { useCallback, useRef, useEffect } from "react";
import { NotificationSettings } from "./useNotificationSettings";

const SOUNDS: Record<string, string> = {
  "notify-default": "/sounds/notify-default.mp3",
  "notify-digital": "/sounds/notify-digital.mp3",
  "notify-classic": "/sounds/notify-classic.mp3",
  "notify-soft": "/sounds/notify-soft.mp3",
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
    console.log('[AudioContext] Already unlocked');
    return true;
  }
  
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      console.warn('[AudioContext] AudioContext not supported');
      return false;
    }
    
    if (!globalAudioContext) {
      globalAudioContext = new AudioContextClass();
      console.log('[AudioContext] Created new context, state:', globalAudioContext.state);
    }
    
    if (globalAudioContext.state === 'suspended') {
      globalAudioContext.resume().then(() => {
        audioUnlocked = true;
        console.log('[AudioContext] ✅ Unlocked successfully after resume');
      }).catch((err) => {
        console.error('[AudioContext] Failed to resume:', err);
      });
    } else if (globalAudioContext.state === 'running') {
      audioUnlocked = true;
      console.log('[AudioContext] ✅ Already running, marked as unlocked');
    }
    
    return audioUnlocked;
  } catch (error) {
    console.error('[AudioContext] Unlock failed:', error);
    return false;
  }
};

// Add event listeners to unlock audio on first interaction
if (typeof window !== 'undefined') {
  const events = ['click', 'touchstart', 'keydown', 'touchend', 'mousedown'];
  const unlockHandler = () => {
    const result = unlockAudio();
    console.log('[AudioContext] Unlock attempt on user interaction, result:', result);
    if (result) {
      events.forEach(event => {
        document.removeEventListener(event, unlockHandler);
      });
    }
  };
  events.forEach(event => {
    document.addEventListener(event, unlockHandler, { passive: true });
  });
  
  // Also try to unlock when page becomes visible
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      console.log('[AudioContext] Page visible, audio status:', getAudioStatus());
    }
  });
}

export const useNotificationSound = (settings: NotificationSettings | null) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Preload audio files for faster playback
  useEffect(() => {
    if (settings?.sound_name) {
      const audio = new Audio(SOUNDS[settings.sound_name] || SOUNDS["notify-default"]);
      audio.preload = 'auto';
      audio.load();
    }
  }, [settings?.sound_name]);

  const playMessageSound = useCallback(() => {
    console.log('[Sound] playMessageSound called, settings:', {
      sound_enabled: settings?.sound_enabled,
      message_sound_enabled: settings?.message_sound_enabled,
      sound_name: settings?.sound_name,
      volume: settings?.volume,
      audioStatus: getAudioStatus()
    });

    if (!settings?.sound_enabled || !settings?.message_sound_enabled) {
      console.log('[Sound] ⏸️ Message sound disabled in settings');
      return;
    }

    try {
      // Try to unlock first
      unlockAudio();
      
      const soundFile = SOUNDS[settings.sound_name] || SOUNDS["notify-default"];
      console.log('[Sound] Loading sound file:', soundFile);
      
      const audio = new Audio(soundFile);
      audio.volume = settings.volume;
      
      // Try to resume audio context if suspended
      if (globalAudioContext?.state === 'suspended') {
        globalAudioContext.resume().then(() => {
          console.log('[Sound] AudioContext resumed before playing');
        });
      }
      
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('[Sound] ✅ Message sound played successfully');
          })
          .catch((error) => {
            console.error('[Sound] ❌ Error playing message sound:', error.message);
            // Provide visual feedback when sound fails
            console.warn('[Sound] Sound blocked by browser policy. User interaction required.');
          });
      }
    } catch (error) {
      console.error('[Sound] Error creating audio:', error);
    }
  }, [settings]);

  const playNotificationSound = useCallback(() => {
    console.log('[Sound] playNotificationSound called, settings:', {
      sound_enabled: settings?.sound_enabled,
      notification_sound_enabled: settings?.notification_sound_enabled,
      sound_name: settings?.sound_name,
      volume: settings?.volume,
      audioStatus: getAudioStatus()
    });

    if (!settings?.sound_enabled || !settings?.notification_sound_enabled) {
      console.log('[Sound] ⏸️ Notification sound disabled in settings');
      return;
    }

    try {
      // Try to unlock first
      unlockAudio();
      
      const soundFile = SOUNDS[settings.sound_name] || SOUNDS["notify-default"];
      console.log('[Sound] Loading sound file:', soundFile);
      
      const audio = new Audio(soundFile);
      audio.volume = settings.volume;
      
      // Try to resume audio context if suspended
      if (globalAudioContext?.state === 'suspended') {
        globalAudioContext.resume().then(() => {
          console.log('[Sound] AudioContext resumed before playing');
        });
      }
      
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('[Sound] ✅ Notification sound played successfully');
          })
          .catch((error) => {
            console.error('[Sound] ❌ Error playing notification sound:', error.message);
            console.warn('[Sound] Sound blocked by browser policy. User interaction required.');
          });
      }
    } catch (error) {
      console.error('[Sound] Error creating audio:', error);
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
        console.error('[Sound] Error playing preview sound:', error);
      });
    } catch (error) {
      console.error('[Sound] Error creating preview audio:', error);
    }
  }, [settings?.volume]);

  const playBirthdaySound = useCallback(() => {
    if (!settings?.sound_enabled) {
      console.log('[Sound] Birthday sound disabled in settings');
      return;
    }

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const audioContext = new AudioContextClass();
      
      // Resume if suspended
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      // Happy Birthday melody (first phrase)
      const notes = [
        { freq: 264, duration: 0.2 },  // C
        { freq: 264, duration: 0.2 },  // C
        { freq: 297, duration: 0.4 },  // D
        { freq: 264, duration: 0.4 },  // C
        { freq: 352, duration: 0.4 },  // F
        { freq: 330, duration: 0.6 },  // E
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
        
        // Fade out to avoid clicks
        gainNode.gain.setValueAtTime((settings?.volume || 0.7) * 0.3, time);
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + note.duration);
        
        oscillator.start(time);
        oscillator.stop(time + note.duration);
        time += note.duration;
      });
      
      console.log('[Sound] Birthday sound played successfully');
    } catch (error) {
      console.error('[Sound] Error playing birthday sound:', error);
    }
  }, [settings?.sound_enabled, settings?.volume]);

  return { playMessageSound, playNotificationSound, playPreview, playBirthdaySound };
};

export const SOUND_OPTIONS = [
  { value: "notify-default", label: "Padrão" },
  { value: "notify-digital", label: "Digital" },
  { value: "notify-classic", label: "Clássico" },
  { value: "notify-soft", label: "Suave" },
];
