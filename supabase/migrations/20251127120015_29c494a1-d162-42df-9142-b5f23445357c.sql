-- Criar função SECURITY DEFINER para evitar recursão infinita nas políticas RLS
CREATE OR REPLACE FUNCTION public.is_conversation_participant(conv_id uuid, uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conv_id AND user_id = uid
  );
$$;

-- Remover políticas problemáticas que causam recursão
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;

-- Criar novas políticas sem recursão para conversation_participants
CREATE POLICY "Users can view own participation"
ON conversation_participants FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can view co-participants"
ON conversation_participants FOR SELECT
USING (is_conversation_participant(conversation_id, auth.uid()));

-- Recriar políticas de messages usando a função SECURITY DEFINER
DROP POLICY IF EXISTS "Users can view messages" ON messages;
CREATE POLICY "Users can view messages"
ON messages FOR SELECT
USING (is_conversation_participant(conversation_id, auth.uid()));

DROP POLICY IF EXISTS "Users can send messages" ON messages;
CREATE POLICY "Users can send messages"
ON messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid() 
  AND is_conversation_participant(conversation_id, auth.uid())
);

-- Garantir que a função create_private_conversation usa SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.create_private_conversation(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv_id UUID;
  existing_conv UUID;
BEGIN
  -- Verificar se já existe conversa privada entre os dois usuários
  SELECT c.id INTO existing_conv
  FROM conversations c
  INNER JOIN conversation_participants cp1 ON cp1.conversation_id = c.id
  INNER JOIN conversation_participants cp2 ON cp2.conversation_id = c.id
  WHERE c.type = 'private'
    AND cp1.user_id = auth.uid()
    AND cp2.user_id = other_user_id
  LIMIT 1;
  
  IF existing_conv IS NOT NULL THEN
    RETURN existing_conv;
  END IF;
  
  -- Criar nova conversa privada
  INSERT INTO conversations (type)
  VALUES ('private')
  RETURNING id INTO conv_id;
  
  -- Adicionar ambos os participantes
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES 
    (conv_id, auth.uid()),
    (conv_id, other_user_id);
    
  RETURN conv_id;
END;
$$;