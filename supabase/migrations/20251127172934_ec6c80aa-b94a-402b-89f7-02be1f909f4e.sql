-- 1. Remover políticas problemáticas
DROP POLICY IF EXISTS "Leaders can view leader and pastor roles for chat" ON public.user_roles;
DROP POLICY IF EXISTS "Leaders can view leader and pastor profiles for chat" ON public.profiles;

-- 2. Recriar política de user_roles usando has_role()
CREATE POLICY "Leaders can view leader and pastor roles for chat"
ON public.user_roles
FOR SELECT
USING (
  role IN ('leader', 'pastor')
  AND (
    has_role(auth.uid(), 'leader') 
    OR has_role(auth.uid(), 'pastor') 
    OR has_role(auth.uid(), 'super_admin')
  )
);

-- 3. Criar função auxiliar SECURITY DEFINER para verificar se um profile é líder/pastor
CREATE OR REPLACE FUNCTION public.is_leader_or_pastor(profile_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = profile_id
    AND role IN ('leader', 'pastor')
  );
$$;

-- 4. Recriar política de profiles usando funções SECURITY DEFINER
CREATE POLICY "Leaders can view leader and pastor profiles for chat"
ON public.profiles
FOR SELECT
USING (
  is_leader_or_pastor(id)
  AND (
    has_role(auth.uid(), 'leader') 
    OR has_role(auth.uid(), 'pastor') 
    OR has_role(auth.uid(), 'super_admin')
  )
);