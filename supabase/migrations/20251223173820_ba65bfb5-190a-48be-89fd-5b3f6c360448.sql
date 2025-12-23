-- Habilitar replica identity full para garantir que os dados completos sejam enviados
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Adicionar a tabela notifications à publicação supabase_realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;