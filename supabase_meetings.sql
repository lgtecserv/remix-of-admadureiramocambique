-- Criar tabela de Reuniões
CREATE TABLE IF NOT EXISTS public.worker_meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  theme VARCHAR(255) NOT NULL,
  congregation_id UUID REFERENCES public.congregations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Criar tabela de Presenças
CREATE TABLE IF NOT EXISTS public.meeting_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID REFERENCES public.worker_meetings(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('presente', 'ausente', 'justificado')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(meeting_id, member_id)
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.worker_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_attendance ENABLE ROW LEVEL SECURITY;

-- Políticas para worker_meetings
CREATE POLICY "Enable read access for authenticated users on worker_meetings"
ON public.worker_meetings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for secretaries and admins on worker_meetings"
ON public.worker_meetings FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'secretary')
  )
);

CREATE POLICY "Enable update for secretaries and admins on worker_meetings"
ON public.worker_meetings FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'secretary')
  )
);

CREATE POLICY "Enable delete for secretaries and admins on worker_meetings"
ON public.worker_meetings FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'secretary')
  )
);

-- Políticas para meeting_attendance
CREATE POLICY "Enable read access for authenticated users on meeting_attendance"
ON public.meeting_attendance FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for secretaries and admins on meeting_attendance"
ON public.meeting_attendance FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'secretary')
  )
);

CREATE POLICY "Enable update for secretaries and admins on meeting_attendance"
ON public.meeting_attendance FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'secretary')
  )
);

CREATE POLICY "Enable delete for secretaries and admins on meeting_attendance"
ON public.meeting_attendance FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'secretary')
  )
);
