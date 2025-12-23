-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Drop ALL existing triggers that depend on the function
DROP TRIGGER IF EXISTS on_notification_insert_push ON public.notifications;
DROP TRIGGER IF EXISTS on_notification_insert_trigger ON public.notifications;

-- Drop the old function with CASCADE to remove any remaining dependencies
DROP FUNCTION IF EXISTS public.trigger_push_notification() CASCADE;

-- Create improved function using pg_net for async HTTP calls
CREATE OR REPLACE FUNCTION public.trigger_push_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  supabase_url TEXT := 'https://ofplaocvnlwdnqvlqqka.supabase.co';
BEGIN
  -- Use pg_net for async HTTP POST (more reliable than extensions.http)
  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/send-push-notification',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('notification_id', NEW.id, 'user_id', NEW.user_id)
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE WARNING 'Failed to trigger push notification via pg_net: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate single trigger with correct name
CREATE TRIGGER on_notification_insert_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_push_notification();