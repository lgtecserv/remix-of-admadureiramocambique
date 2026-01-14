import { useState, useEffect, useCallback } from 'react';
import { processQueue } from '@/lib/syncQueue';

interface NetworkStatusState {
  isOnline: boolean;
  wasOffline: boolean;
  pendingActions: number;
  isSyncing: boolean;
}

export function useNetworkStatus() {
  const [state, setState] = useState<NetworkStatusState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    wasOffline: false,
    pendingActions: 0,
    isSyncing: false
  });

  const triggerSync = useCallback(async () => {
    if (!navigator.onLine) return;
    
    setState(prev => ({ ...prev, isSyncing: true }));
    
    try {
      await processQueue();
      setState(prev => ({ ...prev, pendingActions: 0 }));
    } catch (error) {
      console.error('Erro durante sincronização:', error);
    } finally {
      setState(prev => ({ ...prev, isSyncing: false }));
    }
  }, []);

  const updatePendingCount = useCallback(async () => {
    try {
      const { offlineDB } = await import('@/lib/offlineDB');
      const count = await offlineDB.syncQueue
        .filter(item => !item.synced)
        .count();
      setState(prev => ({ ...prev, pendingActions: count }));
    } catch (error) {
      console.error('Erro ao contar ações pendentes:', error);
    }
  }, []);

  useEffect(() => {
    const handleOnline = async () => {
      setState(prev => ({ ...prev, isOnline: true }));
      
      if (state.wasOffline) {
        // Disparar sincronização quando voltar online
        await triggerSync();
      }
    };

    const handleOffline = () => {
      setState(prev => ({
        ...prev,
        isOnline: false,
        wasOffline: true
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Verificar contagem de ações pendentes periodicamente
    updatePendingCount();
    const interval = setInterval(updatePendingCount, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [state.wasOffline, triggerSync, updatePendingCount]);

  return {
    isOnline: state.isOnline,
    wasOffline: state.wasOffline,
    pendingActions: state.pendingActions,
    isSyncing: state.isSyncing,
    triggerSync,
    updatePendingCount
  };
}
