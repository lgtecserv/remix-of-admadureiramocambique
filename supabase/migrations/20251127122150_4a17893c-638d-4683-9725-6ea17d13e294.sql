-- Adicionar coluna delivered_to para rastrear entrega de mensagens
ALTER TABLE messages ADD COLUMN delivered_to uuid[] DEFAULT '{}';

-- Função para marcar mensagem como entregue
CREATE OR REPLACE FUNCTION mark_message_delivered(msg_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE messages 
  SET delivered_to = array_append(delivered_to, auth.uid())
  WHERE id = msg_id 
    AND NOT (auth.uid() = ANY(delivered_to))
    AND sender_id != auth.uid()
    AND is_conversation_participant(conversation_id, auth.uid());
END;
$$;