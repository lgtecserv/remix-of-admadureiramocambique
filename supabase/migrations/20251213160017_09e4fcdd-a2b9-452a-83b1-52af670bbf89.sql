-- Enable the http extension for making HTTP calls from PostgreSQL
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Function to call the push notification edge function
CREATE OR REPLACE FUNCTION public.trigger_push_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  supabase_url TEXT;
  service_key TEXT;
  request_id BIGINT;
BEGIN
  -- Get the Supabase URL from environment
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_key := current_setting('app.settings.service_role_key', true);
  
  -- If settings are not available, use hardcoded URL (edge function is public)
  IF supabase_url IS NULL OR supabase_url = '' THEN
    supabase_url := 'https://ofplaocvnlwdnqvlqqka.supabase.co';
  END IF;

  -- Make HTTP POST request to the edge function
  -- Using pg_net extension for async HTTP calls
  PERFORM extensions.http((
    'POST',
    supabase_url || '/functions/v1/send-push-notification',
    ARRAY[
      extensions.http_header('Content-Type', 'application/json'),
      extensions.http_header('Authorization', 'Bearer ' || COALESCE(service_key, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mcGxhb2N2bmx3ZG5xdmxxcWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4Njk4MjYsImV4cCI6MjA3NjQ0NTgyNn0.6LYOL1QFdMuhpNkCzf5K2AtUk3nkgj3xHlG4jqi10k0'))
    ],
    'application/json',
    json_build_object('notification_id', NEW.id, 'user_id', NEW.user_id)::text
  )::extensions.http_request);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE WARNING 'Failed to trigger push notification: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger to call push notification function after insert
DROP TRIGGER IF EXISTS on_notification_insert_push ON public.notifications;

CREATE TRIGGER on_notification_insert_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_push_notification();