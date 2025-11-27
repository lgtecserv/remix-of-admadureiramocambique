-- 1. Criar função SECURITY DEFINER para verificar líderes do mesmo departamento
CREATE OR REPLACE FUNCTION public.is_same_department_leader(profile_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_roles ur1
    JOIN user_roles ur2 ON ur1.department = ur2.department
    WHERE ur1.user_id = auth.uid() 
    AND ur1.role = 'leader'
    AND ur2.user_id = profile_id 
    AND ur2.role = 'leader'
  );
$$;

-- 2. Remover política problemática
DROP POLICY IF EXISTS "Leaders can view same department leader profiles" ON public.profiles;

-- 3. Recriar política usando função SECURITY DEFINER
CREATE POLICY "Leaders can view same department leader profiles"
ON public.profiles
FOR SELECT
USING (
  is_same_department_leader(id)
);