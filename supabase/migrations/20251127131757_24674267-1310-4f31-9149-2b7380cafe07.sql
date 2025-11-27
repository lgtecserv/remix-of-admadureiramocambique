-- CORREÇÃO 1: Permitir líderes ver profiles de outros líderes/pastores para chat
CREATE POLICY "Leaders can view leader and pastor profiles for chat"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = profiles.id 
    AND ur.role IN ('leader', 'pastor')
  )
  AND
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('leader', 'pastor', 'super_admin')
  )
);

-- CORREÇÃO 2: Função para criar notificação de nova mensagem
CREATE OR REPLACE FUNCTION notify_message_recipient()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_id UUID;
  sender_name TEXT;
  conv_type TEXT;
BEGIN
  -- Buscar tipo da conversa
  SELECT type INTO conv_type 
  FROM conversations 
  WHERE id = NEW.conversation_id;
  
  -- Buscar nome do remetente
  SELECT full_name INTO sender_name 
  FROM profiles 
  WHERE id = NEW.sender_id;
  
  -- Para cada participante que não seja o remetente
  FOR recipient_id IN 
    SELECT user_id 
    FROM conversation_participants 
    WHERE conversation_id = NEW.conversation_id 
    AND user_id != NEW.sender_id
  LOOP
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      recipient_id,
      CASE 
        WHEN conv_type = 'general' THEN 'Nova mensagem no Chat Geral'
        ELSE 'Nova mensagem de ' || COALESCE(sender_name, 'Usuário')
      END,
      LEFT(NEW.content, 100),
      'info',
      '/chat'
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Trigger para executar após inserção de mensagem
CREATE TRIGGER on_message_insert
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION notify_message_recipient();