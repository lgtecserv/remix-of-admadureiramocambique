-- Fix 1: Drop problematic RLS policy that queries auth.users
DROP POLICY IF EXISTS "Super admin can manage pastor roles" ON public.user_roles;

-- Fix 2: Recreate is_super_admin function to check profiles table instead of auth.users
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = _user_id 
    AND email = 'lgtecserv@gmail.com'
  );
END;
$$;

-- Fix 3: Recreate the policy using the corrected function
CREATE POLICY "Super admin can manage pastor roles"
ON public.user_roles
FOR ALL
USING (public.is_super_admin(auth.uid()));