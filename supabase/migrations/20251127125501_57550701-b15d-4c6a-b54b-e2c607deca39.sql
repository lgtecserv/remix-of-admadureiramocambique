-- FASE 2: Criar configurações de notificação para usuários que não têm
CREATE OR REPLACE FUNCTION create_missing_notification_settings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_notification_settings (user_id, sound_enabled, sound_name, message_sound_enabled, notification_sound_enabled, volume)
  SELECT ur.user_id, true, 'notify-default', true, true, 0.7
  FROM user_roles ur
  WHERE NOT EXISTS (
    SELECT 1 FROM user_notification_settings uns
    WHERE uns.user_id = ur.user_id
  );
END;
$$;

-- Executar função para criar configurações faltantes
SELECT create_missing_notification_settings();

-- FASE 3.1: Atualizar trigger para incluir super_admin no chat geral
DROP TRIGGER IF EXISTS on_user_role_created ON user_roles;

CREATE OR REPLACE FUNCTION public.add_leader_to_general_chat()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  general_conv_id UUID;
BEGIN
  -- Incluir leader, pastor e super_admin
  IF NEW.role IN ('leader', 'pastor', 'super_admin') THEN
    SELECT id INTO general_conv_id
    FROM conversations
    WHERE type = 'general'
    LIMIT 1;
    
    IF general_conv_id IS NOT NULL THEN
      INSERT INTO conversation_participants (conversation_id, user_id)
      VALUES (general_conv_id, NEW.user_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_user_role_created
  AFTER INSERT ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.add_leader_to_general_chat();

-- FASE 3.2: Adicionar super_admin ao chat geral existente
INSERT INTO conversation_participants (conversation_id, user_id)
SELECT c.id, 'aff25e57-3441-4ba8-bff2-33c6cbe79ba7'
FROM conversations c
WHERE c.type = 'general'
ON CONFLICT DO NOTHING;

-- FASE 3.3: Atualizar função create_general_chat para incluir super_admin
CREATE OR REPLACE FUNCTION public.create_general_chat()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  general_conv_id UUID;
BEGIN
  -- Criar conversa geral se não existir
  INSERT INTO conversations (type, name)
  VALUES ('general', 'Chat Geral')
  ON CONFLICT DO NOTHING
  RETURNING id INTO general_conv_id;
  
  IF general_conv_id IS NULL THEN
    SELECT id INTO general_conv_id
    FROM conversations
    WHERE type = 'general'
    LIMIT 1;
  END IF;
  
  -- Adicionar todos os líderes, pastores e super_admins
  INSERT INTO conversation_participants (conversation_id, user_id)
  SELECT general_conv_id, user_id
  FROM user_roles
  WHERE role IN ('leader', 'pastor', 'super_admin')
  ON CONFLICT DO NOTHING;
END;
$$;