import { useState, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Volume2, Play, Save } from "lucide-react";
import { useNotificationSettings, NotificationSettings as NotificationSettingsType } from "@/hooks/useNotificationSettings";
import { useNotificationSound, MESSAGE_SOUND_OPTIONS, IN_CONVERSATION_SOUND_OPTIONS, ALERT_SOUND_OPTIONS } from "@/hooks/useNotificationSound";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface NotificationSettingsProps {
  userId: string | undefined;
}

const NotificationSettings = ({ userId }: NotificationSettingsProps) => {
  const { settings, updateSettings, loading } = useNotificationSettings(userId);
  const { playPreview } = useNotificationSound(settings);
  
  // Estado local para alterações não salvas
  const [localSettings, setLocalSettings] = useState<NotificationSettingsType | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const initialSettingsRef = useRef<string>("");

  // Sincroniza estado local com settings carregadas
  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
      initialSettingsRef.current = JSON.stringify(settings);
      setHasChanges(false);
    }
  }, [settings]);

  // Detecta mudanças
  useEffect(() => {
    if (localSettings && initialSettingsRef.current) {
      const changed = JSON.stringify(localSettings) !== initialSettingsRef.current;
      setHasChanges(changed);
    }
  }, [localSettings]);

  const handleLocalChange = (updates: Partial<NotificationSettingsType>) => {
    setLocalSettings(prev => prev ? { ...prev, ...updates } : null);
  };

  const handleSave = async () => {
    if (!localSettings || !hasChanges) return;
    
    setSaving(true);
    const success = await updateSettings({
      sound_enabled: localSettings.sound_enabled,
      message_sound_enabled: localSettings.message_sound_enabled,
      notification_sound_enabled: localSettings.notification_sound_enabled,
      volume: localSettings.volume,
      message_sound_name: localSettings.message_sound_name,
      in_conversation_sound_name: localSettings.in_conversation_sound_name,
      in_conversation_volume: localSettings.in_conversation_volume,
      alert_sound_name: localSettings.alert_sound_name,
    });
    
    if (success) {
      toast.success("Configurações de notificação salvas!");
      initialSettingsRef.current = JSON.stringify(localSettings);
      setHasChanges(false);
    } else {
      toast.error("Erro ao salvar configurações");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!localSettings) {
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
          checked={localSettings.sound_enabled}
          onCheckedChange={(checked) =>
            handleLocalChange({ sound_enabled: checked })
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
          checked={localSettings.message_sound_enabled}
          onCheckedChange={(checked) =>
            handleLocalChange({ message_sound_enabled: checked })
          }
          disabled={!localSettings.sound_enabled}
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
          checked={localSettings.notification_sound_enabled}
          onCheckedChange={(checked) =>
            handleLocalChange({ notification_sound_enabled: checked })
          }
          disabled={!localSettings.sound_enabled}
        />
      </div>

      {/* Message sound selection - Sons curtos */}
      <div className="space-y-3">
        <Label className="text-base">Som de Mensagens (curtos)</Label>
        <p className="text-sm text-muted-foreground">
          Tocado quando você recebe uma mensagem e não está na conversa
        </p>
        <RadioGroup
          value={localSettings.message_sound_name}
          onValueChange={(value) => handleLocalChange({ message_sound_name: value })}
          className="space-y-2"
          disabled={!localSettings.sound_enabled}
        >
          {MESSAGE_SOUND_OPTIONS.map((option) => (
            <div
              key={option.value}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex items-center space-x-3">
                <RadioGroupItem value={option.value} id={`msg-${option.value}`} />
                <Label
                  htmlFor={`msg-${option.value}`}
                  className="font-normal cursor-pointer"
                >
                  {option.label}
                </Label>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => playPreview(option.value, localSettings.volume)}
                disabled={!localSettings.sound_enabled}
              >
                <Play className="h-4 w-4 mr-1" />
                Ouvir
              </Button>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* In-conversation sound selection */}
      <div className="space-y-3">
        <Label className="text-base">Som na Conversa Ativa</Label>
        <p className="text-sm text-muted-foreground">
          Tocado quando você está dentro da conversa (volume baixo)
        </p>
        <RadioGroup
          value={localSettings.in_conversation_sound_name}
          onValueChange={(value) => handleLocalChange({ in_conversation_sound_name: value })}
          className="space-y-2"
          disabled={!localSettings.sound_enabled}
        >
          {IN_CONVERSATION_SOUND_OPTIONS.map((option) => (
            <div
              key={option.value}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex items-center space-x-3">
                <RadioGroupItem value={option.value} id={`conv-${option.value}`} />
                <Label
                  htmlFor={`conv-${option.value}`}
                  className="font-normal cursor-pointer"
                >
                  {option.label}
                </Label>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => playPreview(option.value, localSettings.in_conversation_volume)}
                disabled={!localSettings.sound_enabled}
              >
                <Play className="h-4 w-4 mr-1" />
                Ouvir
              </Button>
            </div>
          ))}
        </RadioGroup>
        
        {/* Volume for in-conversation */}
        <div className="space-y-2 mt-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              Volume na conversa
            </Label>
            <span className="text-sm text-muted-foreground">
              {Math.round(localSettings.in_conversation_volume * 100)}%
            </span>
          </div>
          <Slider
            value={[localSettings.in_conversation_volume * 100]}
            onValueChange={(value) => handleLocalChange({ in_conversation_volume: value[0] / 100 })}
            max={100}
            step={5}
            disabled={!localSettings.sound_enabled}
            className="w-full"
          />
        </div>
      </div>

      {/* Alert sound selection - Sons longos */}
      <div className="space-y-3">
        <Label className="text-base">Som de Alertas Gerais (longos)</Label>
        <p className="text-sm text-muted-foreground">
          Tocado para notificações do sistema (patrimônio, solicitações, etc)
        </p>
        <RadioGroup
          value={localSettings.alert_sound_name}
          onValueChange={(value) => handleLocalChange({ alert_sound_name: value })}
          className="space-y-2"
          disabled={!localSettings.sound_enabled}
        >
          {ALERT_SOUND_OPTIONS.map((option) => (
            <div
              key={option.value}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex items-center space-x-3">
                <RadioGroupItem value={option.value} id={`alert-${option.value}`} />
                <Label
                  htmlFor={`alert-${option.value}`}
                  className="font-normal cursor-pointer"
                >
                  {option.label}
                </Label>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => playPreview(option.value, localSettings.volume)}
                disabled={!localSettings.sound_enabled}
              >
                <Play className="h-4 w-4 mr-1" />
                Ouvir
              </Button>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Volume slider geral */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="volume" className="text-base flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            Volume Geral
          </Label>
          <span className="text-sm text-muted-foreground">
            {Math.round(localSettings.volume * 100)}%
          </span>
        </div>
        <Slider
          id="volume"
          value={[localSettings.volume * 100]}
          onValueChange={(value) => handleLocalChange({ volume: value[0] / 100 })}
          max={100}
          step={5}
          disabled={!localSettings.sound_enabled}
          className="w-full"
        />
      </div>

      {/* Botão Salvar */}
      <Button 
        onClick={handleSave} 
        disabled={!hasChanges || saving}
        className="w-full"
      >
        <Save className="h-4 w-4 mr-2" />
        {saving ? "Salvando..." : "Salvar Configurações"}
      </Button>
    </div>
  );
};

export default NotificationSettings;
