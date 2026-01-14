import { offlineDB, SyncAction } from './offlineDB';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 segundo

// Tipos de tabelas suportadas para sincronização
type SyncTable = 'messages' | 'members' | 'visitors' | 'attendances';

/**
 * Adiciona uma ação à fila de sincronização
 */
export async function queueAction(action: Omit<SyncAction, 'id' | 'created_at' | 'synced' | 'retry_count'>): Promise<number> {
  const newAction: Omit<SyncAction, 'id'> = {
    ...action,
    created_at: new Date().toISOString(),
    synced: false,
    retry_count: 0
  };

  const id = await offlineDB.syncQueue.add(newAction);
  console.log(`Ação adicionada à fila de sync: ${action.type} em ${action.table}`, action.data);
  
  return id as number;
}

/**
 * Processa a fila de sincronização
 */
export async function processQueue(): Promise<{
  processed: number;
  failed: number;
  errors: string[];
}> {
  const result = {
    processed: 0,
    failed: 0,
    errors: [] as string[]
  };

  // Verificar se está online
  if (!navigator.onLine) {
    console.log('Offline - sincronização adiada');
    return result;
  }

  // Buscar ações pendentes ordenadas por data de criação
  const pendingActions = await offlineDB.syncQueue
    .filter(item => !item.synced && item.retry_count < MAX_RETRIES)
    .sortBy('created_at');

  if (pendingActions.length === 0) {
    console.log('Nenhuma ação pendente para sincronizar');
    return result;
  }

  console.log(`Processando ${pendingActions.length} ações pendentes...`);

  for (const action of pendingActions) {
    try {
      await processAction(action);
      
      // Marcar como sincronizado
      await offlineDB.syncQueue.update(action.id!, { synced: true });
      result.processed++;
      
      console.log(`Ação ${action.id} sincronizada com sucesso`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error(`Erro ao sincronizar ação ${action.id}:`, errorMessage);
      
      // Incrementar contador de tentativas
      await offlineDB.syncQueue.update(action.id!, {
        retry_count: action.retry_count + 1,
        error_message: errorMessage
      });
      
      result.failed++;
      result.errors.push(`${action.type} ${action.table}: ${errorMessage}`);
      
      // Pequeno delay antes da próxima tentativa
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }

  // Mostrar resumo
  if (result.processed > 0) {
    toast.success(`${result.processed} ${result.processed === 1 ? 'ação sincronizada' : 'ações sincronizadas'}`);
  }
  
  if (result.failed > 0) {
    toast.error(`${result.failed} ${result.failed === 1 ? 'ação falhou' : 'ações falharam'}`);
  }

  // Limpar ações sincronizadas antigas (mais de 24h)
  await cleanupOldActions();

  return result;
}

/**
 * Processa uma única ação de sincronização
 */
async function processAction(action: SyncAction): Promise<void> {
  const { type, table, data } = action;
  const tableName = table as SyncTable;

  switch (type) {
    case 'INSERT': {
      // Usar any para contornar tipagem estrita do Supabase
      const insertData = data as Record<string, unknown>;
      const { error } = await supabase
        .from(tableName)
        .insert(insertData as never);
      
      if (error) {
        // Ignorar erro de duplicata (já foi sincronizado antes)
        if (error.code === '23505') {
          console.log(`Registro já existe em ${table}, ignorando...`);
          return;
        }
        throw error;
      }
      break;
    }
    
    case 'UPDATE': {
      if (!data.id) throw new Error('ID não fornecido para UPDATE');
      
      const { id, ...updateData } = data as { id: string; [key: string]: unknown };
      const { error } = await supabase
        .from(tableName)
        .update(updateData as never)
        .eq('id', id);
      
      if (error) throw error;
      break;
    }
    
    case 'DELETE': {
      if (!data.id) throw new Error('ID não fornecido para DELETE');
      
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', data.id as string);
      
      if (error) throw error;
      break;
    }
    
    default:
      throw new Error(`Tipo de ação desconhecido: ${type}`);
  }
}

/**
 * Limpa ações sincronizadas há mais de 24 horas
 */
async function cleanupOldActions(): Promise<void> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  await offlineDB.syncQueue
    .filter(item => item.synced && item.created_at < oneDayAgo)
    .delete();
}

/**
 * Obtém o número de ações pendentes
 */
export async function getPendingActionsCount(): Promise<number> {
  return offlineDB.syncQueue
    .filter(item => !item.synced)
    .count();
}

/**
 * Obtém todas as ações pendentes
 */
export async function getPendingActions(): Promise<SyncAction[]> {
  return offlineDB.syncQueue
    .filter(item => !item.synced)
    .toArray();
}

/**
 * Limpa a fila de sincronização
 */
export async function clearQueue(): Promise<void> {
  await offlineDB.syncQueue.clear();
}

/**
 * Remove uma ação específica da fila
 */
export async function removeAction(id: number): Promise<void> {
  await offlineDB.syncQueue.delete(id);
}
