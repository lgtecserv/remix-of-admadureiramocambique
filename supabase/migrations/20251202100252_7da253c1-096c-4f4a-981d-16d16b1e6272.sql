-- Remover trigger anterior que usa net.http_post (não funciona sem extensão)
DROP TRIGGER IF EXISTS on_notification_created ON notifications;
DROP FUNCTION IF EXISTS send_push_on_notification();

-- A edge function será chamada pelo frontend quando necessário
-- Por enquanto, as push notifications funcionarão via Service Worker
-- quando o navegador receber as notificações do sistema
