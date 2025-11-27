-- Recriar função notify_message_recipient sem a chamada net.http_post()
CREATE OR REPLACE FUNCTION public.notify_message_recipient()
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
    -- Criar notificação no banco de dados
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