import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Volume2, Play } from "lucide-react";
import { useNotificationSettings } from "@/hooks/useNotificationSettings";
import { useNotificationSound, SOUND_OPTIONS } from "@/hooks/useNotificationSound";
import { Skeleton } from "@/components/ui/skeleton";

interface NotificationSettingsProps {
  userId: string | undefined;
}

const NotificationSettings = ({ userId }: NotificationSettingsProps) => {
  const { settings, updateSettings, loading } = useNotificationSettings(userId);
  const { playPreview } = useNotificationSound(settings);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-sm text-muted-foreground">
        Não foi possível carregar as configurações de notificação.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Master sound toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="sound-enabled" className="text-base">
            Som de notificações
          </Label>
          <p className="text-sm text-muted-foreground">
            Ativar ou desativar todos os sons
          </p>
        </div>
        <Switch
          id="sound-enabled"
          checked={settings.sound_enabled}
          onCheckedChange={(checked) =>
            updateSettings({ sound_enabled: checked })
          }
        />
      </div>

      {/* Message sound toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="message-sound" className="text-base">
            Som de mensagens
          </Label>
          <p className="text-sm text-muted-foreground">
            Tocar som ao receber novas mensagens no chat
          </p>
        </div>
        <Switch
          id="message-sound"
          checked={settings.message_sound_enabled}
          onCheckedChange={(checked) =>
            updateSettings({ message_sound_enabled: checked })
          }
          disabled={!settings.sound_enabled}
        />
      </div>

      {/* Notification sound toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="notification-sound" className="text-base">
            Som de alertas gerais
          </Label>
          <p className="text-sm text-muted-foreground">
            Tocar som ao receber notificações do sistema
          </p>
        </div>
        <Switch
          id="notification-sound"
          checked={settings.notification_sound_enabled}
          onCheckedChange={(checked) =>
            updateSettings({ notification_sound_enabled: checked })
          }
          disabled={!settings.sound_enabled}
        />
      </div>

      {/* Sound selection */}
      <div className="space-y-3">
        <Label className="text-base">Escolher som</Label>
        <RadioGroup
          value={settings.sound_name}
          onValueChange={(value) => updateSettings({ sound_name: value })}
          className="space-y-2"
          disabled={!settings.sound_enabled}
        >
          {SOUND_OPTIONS.map((option) => (
            <div
              key={option.value}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex items-center space-x-3">
                <RadioGroupItem value={option.value} id={option.value} />
                <Label
                  htmlFor={option.value}
                  className="font-normal cursor-pointer"
                >
                  {option.label}
                </Label>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => playPreview(option.value)}
                disabled={!settings.sound_enabled}
              >
                <Play className="h-4 w-4 mr-1" />
                Ouvir
              </Button>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Volume slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="volume" className="text-base flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            Volume
          </Label>
          <span className="text-sm text-muted-foreground">
            {Math.round(settings.volume * 100)}%
          </span>
        </div>
        <Slider
          id="volume"
          value={[settings.volume * 100]}
          onValueChange={(value) => updateSettings({ volume: value[0] / 100 })}
          max={100}
          step={5}
          disabled={!settings.sound_enabled}
          className="w-full"
        />
      </div>
    </div>
  );
};

export default NotificationSettings;
