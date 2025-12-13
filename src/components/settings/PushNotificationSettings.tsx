import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Bell, BellOff, Loader2, RefreshCw, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface PushNotificationSettingsProps {
  userId: string | undefined;
}

const PushNotificationSettings = ({ userId }: PushNotificationSettingsProps) => {
  const { permission, isSubscribed, loading, requestPermission, unsubscribe, retryPermission } = usePushNotifications(userId);
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = async () => {
    if (!userId) {
      toast.error("Usuário não encontrado");
      return;
    }

    setIsToggling(true);
    try {
      if (isSubscribed) {
        await unsubscribe();
      } else {
        await requestPermission();
      }
    } catch (error) {
      console.error("Error toggling push notifications:", error);
      toast.error("Erro ao configurar notificações push");
    } finally {
      setIsToggling(false);
    }
  };

  const handleRetry = () => {
    retryPermission();
    toast.info("Verificando permissões...");
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

  const isLoading = loading || isToggling;

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

      {permission !== "denied" && (
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
            disabled={isLoading}
          />
        </div>
      )}

      {permission === "denied" && (
        <div className="text-sm bg-destructive/10 border border-destructive/30 p-4 rounded-md space-y-3">
          <p className="font-medium text-destructive">Notificações bloqueadas pelo navegador</p>
          <p className="text-muted-foreground">
            Para receber notificações, você precisa desbloquear manualmente nas configurações do navegador:
          </p>
          <ol className="list-decimal list-inside text-muted-foreground space-y-1 text-xs">
            <li>Clique no ícone de cadeado 🔒 na barra de endereço</li>
            <li>Encontre "Notificações" nas permissões do site</li>
            <li>Altere de "Bloqueado" para "Permitir"</li>
            <li>Recarregue a página</li>
          </ol>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="flex-1"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Verificar novamente
            </Button>
          </div>
        </div>
      )}

      {permission === "default" && (
        <Button
          variant="outline"
          onClick={handleToggle}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          <Bell className="h-4 w-4 mr-2" />
          Ativar Notificações Push
        </Button>
      )}

      {permission === "granted" && isSubscribed && (
        <p className="text-xs text-muted-foreground text-center">
          ✅ Você receberá alertas mesmo quando o aplicativo estiver fechado
        </p>
      )}
    </div>
  );
};

export default PushNotificationSettings;
