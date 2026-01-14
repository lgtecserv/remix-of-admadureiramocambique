import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { offlineDB, OfflineMember } from '@/lib/offlineDB';
import { useNetworkStatus } from './useNetworkStatus';

// Hook específico para membros com filtros comuns
export function useOfflineMembers(filters?: {
  department?: string;
  status?: string;
  leaderId?: string;
}) {
  const { isOnline } = useNetworkStatus();
  const [members, setMembers] = useState<OfflineMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    
    try {
      if (isOnline) {
        // Buscar do Supabase
        let query = supabase.from('members').select('*');
        
        if (filters?.department) {
          query = query.eq('department', filters.department as 'jovens' | 'irmas' | 'varoes' | 'adolescentes' | 'criancas' | 'patrimonio' | 'tesouraria');
        }
        if (filters?.status) {
          query = query.eq('status', filters.status as 'novo' | 'ativo' | 'inativo');
        }
        if (filters?.leaderId) {
          query = query.eq('leader_id', filters.leaderId);
        }
        
        const { data, error } = await query.order('full_name');
        
        if (error) throw error;
        
        // Salvar no cache
        if (data && data.length > 0) {
          const membersToCache: OfflineMember[] = data.map(m => ({
            id: m.id,
            full_name: m.full_name,
            phone_number: m.phone_number,
            department: m.department,
            status: m.status,
            leader_id: m.leader_id,
            photo_url: m.photo_url,
            address: m.address,
            birth_date: m.birth_date,
            baptism_date: m.baptism_date,
            gender: m.gender,
            marital_status: m.marital_status,
            occupation: m.occupation,
            member_type: m.member_type,
            observations: m.observations,
            created_at: m.created_at,
            updated_at: m.updated_at
          }));
          
          await offlineDB.members.bulkPut(membersToCache);
          setMembers(membersToCache);
          setLastSynced(new Date());
        } else {
          setMembers([]);
        }
      } else {
        // Buscar do IndexedDB
        let result = await offlineDB.members.toArray();
        
        // Aplicar filtros manualmente
        if (filters?.department) {
          result = result.filter(m => m.department === filters.department);
        }
        if (filters?.status) {
          result = result.filter(m => m.status === filters.status);
        }
        if (filters?.leaderId) {
          result = result.filter(m => m.leader_id === filters.leaderId);
        }
        
        // Ordenar por nome
        result.sort((a, b) => a.full_name.localeCompare(b.full_name));
        
        setMembers(result);
      }
    } catch (error) {
      console.error('Erro ao carregar membros:', error);
      
      // Fallback para cache em caso de erro
      try {
        const cached = await offlineDB.members.toArray();
        setMembers(cached);
      } catch (cacheError) {
        console.error('Erro ao carregar do cache:', cacheError);
        setMembers([]);
      }
    } finally {
      setLoading(false);
    }
  }, [isOnline, filters?.department, filters?.status, filters?.leaderId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  return { members, loading, isOnline, lastSynced, refresh: loadMembers };
}

// Hook para conversas offline
export function useOfflineConversations() {
  const { isOnline } = useNetworkStatus();
  const [conversations, setConversations] = useState<{
    id: string;
    name: string | null;
    type: string;
  }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      
      try {
        if (isOnline) {
          const { data, error } = await supabase
            .from('conversations')
            .select('id, name, type')
            .order('updated_at', { ascending: false });
          
          if (error) throw error;
          
          if (data) {
            await offlineDB.conversations.bulkPut(data.map(c => ({
              id: c.id,
              name: c.name,
              type: c.type,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })));
            setConversations(data);
          }
        } else {
          const cached = await offlineDB.conversations.toArray();
          setConversations(cached.map(c => ({
            id: c.id,
            name: c.name ?? null,
            type: c.type
          })));
        }
      } catch (error) {
        console.error('Erro ao carregar conversas:', error);
        const cached = await offlineDB.conversations.toArray();
        setConversations(cached.map(c => ({
          id: c.id,
          name: c.name ?? null,
          type: c.type
        })));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isOnline]);

  return { conversations, loading, isOnline };
}
