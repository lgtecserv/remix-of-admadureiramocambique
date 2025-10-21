-- 1. Adicionar coluna email na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Atualizar trigger para salvar email no perfil
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- 3. Adicionar RLS policy para pastor deletar membros
CREATE POLICY "Pastor can delete all members"
ON public.members
FOR DELETE
USING (has_role(auth.uid(), 'pastor'::app_role));

-- 4. Criar tabela de visitantes
CREATE TABLE IF NOT EXISTS public.visitors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  invited_by TEXT,
  observations TEXT,
  returned BOOLEAN NOT NULL DEFAULT false,
  leader_id UUID NOT NULL,
  department department_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Enable RLS na tabela visitors
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies para visitors
CREATE POLICY "Leaders can view own department visitors"
ON public.visitors
FOR SELECT
USING (
  has_role(auth.uid(), 'leader'::app_role) 
  AND department = get_user_department(auth.uid())
);

CREATE POLICY "Leaders can insert visitors in own department"
ON public.visitors
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'leader'::app_role)
  AND department = get_user_department(auth.uid())
  AND leader_id = auth.uid()
);

CREATE POLICY "Leaders can update own department visitors"
ON public.visitors
FOR UPDATE
USING (
  has_role(auth.uid(), 'leader'::app_role)
  AND leader_id = auth.uid()
);

CREATE POLICY "Leaders can delete own department visitors"
ON public.visitors
FOR DELETE
USING (
  has_role(auth.uid(), 'leader'::app_role)
  AND leader_id = auth.uid()
);

CREATE POLICY "Pastor can view all visitors"
ON public.visitors
FOR SELECT
USING (has_role(auth.uid(), 'pastor'::app_role));

CREATE POLICY "Pastor can manage all visitors"
ON public.visitors
FOR ALL
USING (has_role(auth.uid(), 'pastor'::app_role));

-- 7. Trigger para atualizar updated_at em visitors
CREATE TRIGGER update_visitors_updated_at
BEFORE UPDATE ON public.visitors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();