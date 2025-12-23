-- Adicionar novas colunas para separação de sons por tipo
ALTER TABLE public.user_notification_settings
ADD COLUMN IF NOT EXISTS message_sound_name TEXT DEFAULT 'msg-short-1',
ADD COLUMN IF NOT EXISTS in_conversation_sound_name TEXT DEFAULT 'in-conv-soft',
ADD COLUMN IF NOT EXISTS in_conversation_volume NUMERIC DEFAULT 0.3,
ADD COLUMN IF NOT EXISTS alert_sound_name TEXT DEFAULT 'alert-long-1';

-- Atualizar registros existentes com valores padrão
UPDATE public.user_notification_settings
SET 
  message_sound_name = COALESCE(message_sound_name, 'msg-short-1'),
  in_conversation_sound_name = COALESCE(in_conversation_sound_name, 'in-conv-soft'),
  in_conversation_volume = COALESCE(in_conversation_volume, 0.3),
  alert_sound_name = COALESCE(alert_sound_name, 'alert-long-1')
WHERE message_sound_name IS NULL OR in_conversation_sound_name IS NULL;