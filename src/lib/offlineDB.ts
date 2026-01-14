import Dexie, { Table } from 'dexie';

// Interfaces para os dados offline
export interface OfflineMember {
  id: string;
  full_name: string;
  phone_number: string;
  department: string;
  status: string;
  leader_id: string;
  photo_url?: string | null;
  address?: string | null;
  birth_date?: string | null;
  baptism_date?: string | null;
  gender?: string | null;
  marital_status?: string | null;
  occupation?: string | null;
  member_type?: string | null;
  observations?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OfflineMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  edited_at?: string | null;
  is_deleted: boolean;
  read_by?: string[] | null;
  delivered_to?: string[] | null;
  // Dados do perfil do remetente (para exibição offline)
  sender_name?: string;
  sender_email?: string;
  sender_avatar?: string | null;
  // Flag para indicar se foi sincronizado
  is_synced?: boolean;
}

export interface OfflineConversation {
  id: string;
  name?: string | null;
  type: string;
  created_at: string;
  updated_at: string;
}

export interface SyncAction {
  id?: number;
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  data: Record<string, unknown>;
  created_at: string;
  synced: boolean;
  error_message?: string;
  retry_count: number;
}

export interface OfflineProfile {
  id: string;
  full_name: string;
  email?: string | null;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

class OfflineDatabase extends Dexie {
  members!: Table<OfflineMember>;
  messages!: Table<OfflineMessage>;
  conversations!: Table<OfflineConversation>;
  syncQueue!: Table<SyncAction>;
  profiles!: Table<OfflineProfile>;

  constructor() {
    super('ADMadureiraOffline');
    
    this.version(1).stores({
      members: 'id, full_name, department, status, leader_id, updated_at',
      messages: 'id, conversation_id, sender_id, created_at, is_synced',
      conversations: 'id, type, updated_at',
      syncQueue: '++id, type, table, created_at, synced',
      profiles: 'id, full_name, email'
    });
  }
}

export const offlineDB = new OfflineDatabase();

// Funções utilitárias para gerenciar o banco offline
export async function clearOfflineData(): Promise<void> {
  await Promise.all([
    offlineDB.members.clear(),
    offlineDB.messages.clear(),
    offlineDB.conversations.clear(),
    offlineDB.profiles.clear()
  ]);
}

export async function getOfflineDataStats(): Promise<{
  members: number;
  messages: number;
  conversations: number;
  pendingSync: number;
}> {
  const [members, messages, conversations, pendingSync] = await Promise.all([
    offlineDB.members.count(),
    offlineDB.messages.count(),
    offlineDB.conversations.count(),
    offlineDB.syncQueue.where('synced').equals(0).count()
  ]);

  return { members, messages, conversations, pendingSync };
}
