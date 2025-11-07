-- Tabela de conversas
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('general', 'private')),
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de participantes de conversas
CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  last_read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Tabela de mensagens
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  edited_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT false
);

-- Índices para performance
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_participants_user ON conversation_participants(user_id);
CREATE INDEX idx_participants_conversation ON conversation_participants(conversation_id);

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;

-- RLS Policies
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver conversas das quais participam
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = conversations.id
      AND user_id = auth.uid()
    )
  );

-- Usuários podem ver participantes de suas conversas
CREATE POLICY "Users can view conversation participants"
  ON conversation_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp2
      WHERE cp2.conversation_id = conversation_participants.conversation_id
      AND cp2.user_id = auth.uid()
    )
  );

-- Usuários podem ver mensagens de suas conversas
CREATE POLICY "Users can view messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND user_id = auth.uid()
    )
  );

-- Usuários podem enviar mensagens em conversas que participam
CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND user_id = auth.uid()
    )
  );

-- Usuários podem atualizar suas próprias mensagens
CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  USING (sender_id = auth.uid());

-- Pastores podem criar conversas gerais
CREATE POLICY "Pastors can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'pastor'::app_role));

-- Usuários podem criar conversas privadas
CREATE POLICY "Users can create private conversations"
  ON conversations FOR INSERT
  WITH CHECK (type = 'private');

-- Usuários podem adicionar participantes em conversas que criaram
CREATE POLICY "Users can add participants"
  ON conversation_participants FOR INSERT
  WITH CHECK (true);

-- Usuários podem atualizar seu last_read_at
CREATE POLICY "Users can update own participant record"
  ON conversation_participants FOR UPDATE
  USING (user_id = auth.uid());

-- Função para criar conversa geral automaticamente
CREATE OR REPLACE FUNCTION create_general_chat()
RETURNS void AS $$
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
  
  -- Adicionar todos os líderes e pastores
  INSERT INTO conversation_participants (conversation_id, user_id)
  SELECT general_conv_id, user_id
  FROM user_roles
  WHERE role IN ('leader', 'pastor')
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função para criar conversa privada
CREATE OR REPLACE FUNCTION create_private_conversation(
  other_user_id UUID
)
RETURNS UUID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para adicionar novos líderes ao chat geral
CREATE OR REPLACE FUNCTION add_leader_to_general_chat()
RETURNS TRIGGER AS $$
DECLARE
  general_conv_id UUID;
BEGIN
  IF NEW.role IN ('leader', 'pastor') THEN
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_leader_created
  AFTER INSERT ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION add_leader_to_general_chat();

-- Inicializar chat geral com usuários existentes
SELECT create_general_chat();