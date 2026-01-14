import { WifiOff, RefreshCw, Check } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { cn } from '@/lib/utils';

export function OfflineIndicator() {
  const { isOnline, pendingActions, isSyncing } = useNetworkStatus();

  // Mostrar banner de sincronização quando voltou online e está sincronizando
  if (isOnline && isSyncing) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground py-2 px-4 text-center text-sm animate-fade-in">
        <RefreshCw className="inline-block mr-2 h-4 w-4 animate-spin" />
        Sincronizando {pendingActions} {pendingActions === 1 ? 'ação pendente' : 'ações pendentes'}...
      </div>
    );
  }

  // Mostrar mensagem de sucesso brevemente após sincronização
  if (isOnline && pendingActions === 0) {
    return null;
  }

  // Mostrar banner offline
  if (!isOnline) {
    return (
      <div className={cn(
        "fixed top-0 left-0 right-0 z-50 py-2 px-4 text-center text-sm animate-fade-in",
        "bg-amber-500 text-white"
      )}>
        <WifiOff className="inline-block mr-2 h-4 w-4" />
        <span>
          Você está offline. 
          {pendingActions > 0 && (
            <span className="ml-1">
              ({pendingActions} {pendingActions === 1 ? 'ação será sincronizada' : 'ações serão sincronizadas'} quando a conexão voltar)
            </span>
          )}
        </span>
      </div>
    );
  }

  // Mostrar indicador de ações pendentes quando online mas ainda há pendências
  if (pendingActions > 0) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-muted text-muted-foreground py-2 px-4 text-center text-sm animate-fade-in">
        <RefreshCw className="inline-block mr-2 h-4 w-4" />
        {pendingActions} {pendingActions === 1 ? 'ação pendente' : 'ações pendentes'} para sincronizar
      </div>
    );
  }

  return null;
}

// Componente menor para usar no header
export function OfflineStatusBadge() {
  const { isOnline, pendingActions, isSyncing } = useNetworkStatus();

  if (isOnline && pendingActions === 0 && !isSyncing) {
    return null;
  }

  return (
    <div className={cn(
      "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
      !isOnline && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      isOnline && isSyncing && "bg-primary/10 text-primary",
      isOnline && !isSyncing && pendingActions > 0 && "bg-muted text-muted-foreground"
    )}>
      {!isOnline && (
        <>
          <WifiOff className="h-3 w-3" />
          <span>Offline</span>
        </>
      )}
      {isOnline && isSyncing && (
        <>
          <RefreshCw className="h-3 w-3 animate-spin" />
          <span>Sincronizando...</span>
        </>
      )}
      {isOnline && !isSyncing && pendingActions > 0 && (
        <>
          <RefreshCw className="h-3 w-3" />
          <span>{pendingActions}</span>
        </>
      )}
    </div>
  );
}
