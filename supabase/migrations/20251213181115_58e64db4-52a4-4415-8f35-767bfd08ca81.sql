-- Enable http extension for calling edge functions
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Create or replace the trigger function to call push notification edge function
CREATE OR REPLACE FUNCTION public.trigger_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  supabase_url TEXT;
BEGIN
  supabase_url := 'https://ofplaocvnlwdnqvlqqka.supabase.co';

  -- Make HTTP POST request to the edge function
  PERFORM extensions.http((
    'POST',
    supabase_url || '/functions/v1/send-push-notification',
    ARRAY[
      extensions.http_header('Content-Type', 'application/json')
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_notification_insert_trigger ON public.notifications;

-- Create trigger on notifications table
CREATE TRIGGER on_notification_insert_trigger
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.trigger_push_notification();