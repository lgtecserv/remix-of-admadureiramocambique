-- Add new fields to members table
ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS marital_status TEXT CHECK (marital_status IN ('solteiro', 'casado', 'divorciado', 'viuvo')),
ADD COLUMN IF NOT EXISTS occupation TEXT,
ADD COLUMN IF NOT EXISTS baptism_date DATE,
ADD COLUMN IF NOT EXISTS observations TEXT;

-- Create attendances table for tracking service/event attendance
CREATE TABLE IF NOT EXISTS public.attendances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
  visitor_id UUID REFERENCES public.visitors(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('culto', 'celula', 'evento_especial')),
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  department DEPARTMENT_TYPE NOT NULL,
  leader_id UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT attendance_person_check CHECK (
    (member_id IS NOT NULL AND visitor_id IS NULL) OR 
    (member_id IS NULL AND visitor_id IS NOT NULL)
  )
);

ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;

-- RLS policies for attendances
CREATE POLICY "Pastor can manage all attendances"
ON public.attendances FOR ALL
USING (has_role(auth.uid(), 'pastor'::app_role));

CREATE POLICY "Leaders can view own department attendances"
ON public.attendances FOR SELECT
USING (
  has_role(auth.uid(), 'leader'::app_role) AND 
  department = get_user_department(auth.uid())
);

CREATE POLICY "Leaders can insert attendances in own department"
ON public.attendances FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'leader'::app_role) AND 
  department = get_user_department(auth.uid()) AND 
  leader_id = auth.uid()
);

CREATE POLICY "Leaders can update own department attendances"
ON public.attendances FOR UPDATE
USING (
  has_role(auth.uid(), 'leader'::app_role) AND 
  leader_id = auth.uid()
);

CREATE POLICY "Leaders can delete own department attendances"
ON public.attendances FOR DELETE
USING (
  has_role(auth.uid(), 'leader'::app_role) AND 
  leader_id = auth.uid()
);

-- Create visitor_followups table
CREATE TABLE IF NOT EXISTS public.visitor_followups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id UUID NOT NULL REFERENCES public.visitors(id) ON DELETE CASCADE,
  followup_date DATE NOT NULL DEFAULT CURRENT_DATE,
  followup_type TEXT NOT NULL CHECK (followup_type IN ('ligacao', 'whatsapp', 'visita', 'email')),
  status TEXT NOT NULL CHECK (status IN ('pendente', 'realizado', 'sem_sucesso')),
  notes TEXT,
  leader_id UUID NOT NULL,
  department DEPARTMENT_TYPE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.visitor_followups ENABLE ROW LEVEL SECURITY;

-- RLS policies for visitor_followups
CREATE POLICY "Pastor can manage all followups"
ON public.visitor_followups FOR ALL
USING (has_role(auth.uid(), 'pastor'::app_role));

CREATE POLICY "Leaders can view own department followups"
ON public.visitor_followups FOR SELECT
USING (
  has_role(auth.uid(), 'leader'::app_role) AND 
  department = get_user_department(auth.uid())
);

CREATE POLICY "Leaders can insert followups in own department"
ON public.visitor_followups FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'leader'::app_role) AND 
  department = get_user_department(auth.uid()) AND 
  leader_id = auth.uid()
);

CREATE POLICY "Leaders can update own followups"
ON public.visitor_followups FOR UPDATE
USING (
  has_role(auth.uid(), 'leader'::app_role) AND 
  leader_id = auth.uid()
);

CREATE POLICY "Leaders can delete own followups"
ON public.visitor_followups FOR DELETE
USING (
  has_role(auth.uid(), 'leader'::app_role) AND 
  leader_id = auth.uid()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
  read BOOLEAN NOT NULL DEFAULT FALSE,
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Pastor can create notifications for everyone"
ON public.notifications FOR INSERT
WITH CHECK (has_role(auth.uid(), 'pastor'::app_role));

-- Create triggers for updated_at
CREATE TRIGGER update_attendances_updated_at
BEFORE UPDATE ON public.attendances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_visitor_followups_updated_at
BEFORE UPDATE ON public.visitor_followups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attendances_event_date ON public.attendances(event_date);
CREATE INDEX IF NOT EXISTS idx_attendances_member_id ON public.attendances(member_id);
CREATE INDEX IF NOT EXISTS idx_attendances_department ON public.attendances(department);
CREATE INDEX IF NOT EXISTS idx_visitor_followups_visitor_id ON public.visitor_followups(visitor_id);
CREATE INDEX IF NOT EXISTS idx_visitor_followups_status ON public.visitor_followups(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);