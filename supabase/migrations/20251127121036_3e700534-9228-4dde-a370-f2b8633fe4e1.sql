-- Criar tabela para tracking de digitação
CREATE TABLE typing_indicators (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  is_typing boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- RLS para ver quem está digitando na conversa
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view typing in own conversations"
ON typing_indicators FOR SELECT
USING (is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "Users can update own typing"
ON typing_indicators FOR ALL
USING (user_id = auth.uid());

CREATE POLICY "Super admin can manage all typing indicators"
ON typing_indicators FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE typing_indicators;

-- Adicionar coluna read_by na tabela messages
ALTER TABLE messages ADD COLUMN read_by uuid[] DEFAULT '{}';

-- Função para marcar como lido
CREATE OR REPLACE FUNCTION mark_message_read(msg_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE messages 
  SET read_by = array_append(read_by, auth.uid())
  WHERE id = msg_id 
    AND NOT (auth.uid() = ANY(read_by))
    AND sender_id != auth.uid()
    AND is_conversation_participant(conversation_id, auth.uid());
END;
$$;