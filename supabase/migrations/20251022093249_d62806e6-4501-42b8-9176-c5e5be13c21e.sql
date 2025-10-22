-- Migration 1: Popular emails faltantes dos líderes
-- Atualizar profiles com emails de auth.users para líderes sem email
UPDATE public.profiles
SET email = auth.users.email
FROM auth.users
WHERE profiles.id = auth.users.id
  AND profiles.email IS NULL;

-- Migration 2: Criar função para verificar super-admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_email text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN _email = 'lgtecserv@gmail.com';
END;
$$;

-- Criar política RLS para permitir super-admin gerenciar roles de pastores
CREATE POLICY "Super admin can manage pastor roles"
ON public.user_roles
FOR ALL
USING (
  is_super_admin((SELECT email FROM auth.users WHERE id = auth.uid()))
);

-- Adicionar índice para performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);