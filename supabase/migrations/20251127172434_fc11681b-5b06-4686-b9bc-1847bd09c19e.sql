-- Atualizar trigger para chamar edge function de push notification
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
  new_notification_id UUID;
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
    -- Criar notificação
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
    )
    RETURNING id INTO new_notification_id;
    
    -- Chamar edge function para enviar push notification
    -- Nota: Esta chamada é assíncrona e não bloqueia a inserção
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'notification_id', new_notification_id,
        'user_id', recipient_id
      )
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;