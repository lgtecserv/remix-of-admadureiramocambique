-- Atualizar a função notify_message_recipient para usar o link correto
CREATE OR REPLACE FUNCTION public.notify_message_recipient()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    -- Criar notificação com metadata incluindo conversation_id
    INSERT INTO notifications (user_id, title, message, type, link, metadata)
    VALUES (
      recipient_id,
      CASE 
        WHEN conv_type = 'general' THEN 'Nova mensagem no Chat Geral'
        ELSE 'Nova mensagem de ' || COALESCE(sender_name, 'Usuário')
      END,
      LEFT(NEW.content, 100),
      'message',
      '/dashboard/chat',
      jsonb_build_object('conversation_id', NEW.conversation_id)
    );
  END LOOP;
  
  RETURN NEW;
END;
$function$;