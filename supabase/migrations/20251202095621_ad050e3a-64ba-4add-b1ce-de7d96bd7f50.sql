-- Função para enviar push notification via edge function quando uma notificação é criada
CREATE OR REPLACE FUNCTION send_push_on_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Chamar edge function para enviar push notification de forma assíncrona
  -- Isso garante que push notifications sejam enviadas mesmo quando o app está fechado
  PERFORM net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key')
    ),
    body := jsonb_build_object(
      'notification_id', NEW.id,
      'user_id', NEW.user_id
    )
  );
  
  RETURN NEW;
END;
$$;

-- Criar trigger para enviar push notifications
DROP TRIGGER IF EXISTS on_notification_created ON notifications;
CREATE TRIGGER on_notification_created
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION send_push_on_notification();

-- Comentário explicativo
COMMENT ON FUNCTION send_push_on_notification() IS 'Envia push notification via edge function quando uma notificação é criada na tabela notifications';
