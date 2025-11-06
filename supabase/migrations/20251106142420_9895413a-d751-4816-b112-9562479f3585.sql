-- Add RLS policies to allow pastors and super admin to view all profiles
-- This is needed for LeaderManagement, SuperAdmin, and TransferMembersDialog components
-- which join user_roles with profiles table

-- Allow pastors to view all profiles
CREATE POLICY "Pastor can view all profiles"
  ON public.profiles 
  FOR SELECT
  USING (public.has_role(auth.uid(), 'pastor'::app_role));

-- Allow super admin to view all profiles
CREATE POLICY "Super admin can view all profiles"
  ON public.profiles 
  FOR SELECT
  USING (public.is_super_admin(auth.uid()));

-- Allow leaders to view profiles of other leaders in the same department
-- This is needed for the TransferMembersDialog
CREATE POLICY "Leaders can view same department leader profiles"
  ON public.profiles 
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM public.user_roles ur1
      INNER JOIN public.user_roles ur2 ON ur1.department = ur2.department
      WHERE ur1.user_id = auth.uid()
      AND ur1.role = 'leader'::app_role
      AND ur2.user_id = profiles.id
      AND ur2.role = 'leader'::app_role
    )
  );