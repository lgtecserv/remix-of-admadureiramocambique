-- Create user notification settings table
CREATE TABLE IF NOT EXISTS public.user_notification_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  sound_enabled boolean NOT NULL DEFAULT true,
  sound_name text NOT NULL DEFAULT 'notify-default',
  message_sound_enabled boolean NOT NULL DEFAULT true,
  notification_sound_enabled boolean NOT NULL DEFAULT true,
  volume numeric NOT NULL DEFAULT 0.7 CHECK (volume >= 0 AND volume <= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_notification_settings ENABLE ROW LEVEL SECURITY;

-- Users can view and manage their own notification settings
CREATE POLICY "Users can view own notification settings"
ON public.user_notification_settings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification settings"
ON public.user_notification_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification settings"
ON public.user_notification_settings
FOR UPDATE
USING (auth.uid() = user_id);

-- Super admin can manage all notification settings
CREATE POLICY "Super admin can manage all notification settings"
ON public.user_notification_settings
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Add updated_at trigger
CREATE TRIGGER update_user_notification_settings_updated_at
  BEFORE UPDATE ON public.user_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();