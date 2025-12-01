import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PushNotificationSettingsProps {
  userId: string | undefined;
}

const PushNotificationSettings = ({ userId }: PushNotificationSettingsProps) => {
  const { permission, isSubscribed, requestPermission, unsubscribe } = usePushNotifications(userId);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (!userId) {
      toast.error("Usuário não encontrado");
      return;
    }

    setLoading(true);
    try {
      if (isSubscribed) {
        await unsubscribe();
        toast.success("Notificações push desativadas");
      } else {
        await requestPermission();
        toast.success("Notificações push ativadas");
      }
    } catch (error) {
      console.error("Error toggling push notifications:", error);
      toast.error("Erro ao configurar notificações push");
    } finally {
      setLoading(false);
    }
  };

  const getPermissionBadge = () => {
    if (permission === "granted") {
      return <Badge className="bg-green-500">Permitido</Badge>;
    } else if (permission === "denied") {
      return <Badge variant="destructive">Bloqueado</Badge>;
    } else {
      return <Badge variant="outline">Não solicitado</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label className="text-base">Notificações Push</Label>
          <p className="text-sm text-muted-foreground">
            Receba alertas mesmo quando o app estiver fechado
          </p>
        </div>
        {getPermissionBadge()}
      </div>

      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          {isSubscribed ? (
            <Bell className="h-4 w-4 text-green-500" />
          ) : (
            <BellOff className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm">
            {isSubscribed ? "Ativado" : "Desativado"}
          </span>
        </div>
        <Switch
          checked={isSubscribed}
          onCheckedChange={handleToggle}
          disabled={loading || permission === "denied"}
        />
      </div>

      {permission === "denied" && (
        <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
          <p className="font-medium mb-1">Notificações bloqueadas</p>
          <p>
            Você bloqueou as notificações. Para habilitar, acesse as configurações do seu navegador e 
            permita notificações para este site.
          </p>
        </div>
      )}

      {permission === "default" && (
        <Button
          variant="outline"
          onClick={handleToggle}
          disabled={loading}
          className="w-full"
        >
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          <Bell className="h-4 w-4 mr-2" />
          Ativar Notificações Push
        </Button>
      )}
    </div>
  );
};

export default PushNotificationSettings;
