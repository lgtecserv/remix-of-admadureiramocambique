
-- 1. Adicionar 'secretary' ao enum app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'secretary';

-- 2. Helper SECURITY DEFINER usando cast text (independente do commit do enum)
CREATE OR REPLACE FUNCTION public.is_secretary(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = 'secretary'
  )
$$;

-- 3. Novos campos em members
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS church_function text,
  ADD COLUMN IF NOT EXISTS church_office  text;

-- =========================================================
-- 4. RLS — rebaixar super_admin para SELECT e dar ALL ao secretary
-- =========================================================

-- members
DROP POLICY IF EXISTS members_super_all ON public.members;
DROP POLICY IF EXISTS "Pastor can delete all members" ON public.members;
DROP POLICY IF EXISTS "Only pastor can delete members" ON public.members;
DROP POLICY IF EXISTS members_leader_delete ON public.members;
CREATE POLICY members_super_select ON public.members FOR SELECT
  USING (public.is_super_admin(auth.uid()));
CREATE POLICY members_secretary_all ON public.members FOR ALL
  USING (public.is_secretary(auth.uid()))
  WITH CHECK (public.is_secretary(auth.uid()));

-- expenses
DROP POLICY IF EXISTS exp_super_all ON public.expenses;
DROP POLICY IF EXISTS "Super admin pode gerenciar todos gastos" ON public.expenses;
CREATE POLICY exp_super_select ON public.expenses FOR SELECT
  USING (public.is_super_admin(auth.uid()));
CREATE POLICY exp_secretary_all ON public.expenses FOR ALL
  USING (public.is_secretary(auth.uid()))
  WITH CHECK (public.is_secretary(auth.uid()));

-- offerings
DROP POLICY IF EXISTS off_super_all ON public.offerings;
CREATE POLICY off_super_select ON public.offerings FOR SELECT
  USING (public.is_super_admin(auth.uid()));
CREATE POLICY off_secretary_all ON public.offerings FOR ALL
  USING (public.is_secretary(auth.uid()))
  WITH CHECK (public.is_secretary(auth.uid()));

-- tithes
DROP POLICY IF EXISTS tithes_super_all ON public.tithes;
CREATE POLICY tithes_super_select ON public.tithes FOR SELECT
  USING (public.is_super_admin(auth.uid()));
CREATE POLICY tithes_secretary_all ON public.tithes FOR ALL
  USING (public.is_secretary(auth.uid()))
  WITH CHECK (public.is_secretary(auth.uid()));

-- balance_adjustments
DROP POLICY IF EXISTS bal_super_all ON public.balance_adjustments;
CREATE POLICY bal_super_select ON public.balance_adjustments FOR SELECT
  USING (public.is_super_admin(auth.uid()));
CREATE POLICY bal_secretary_all ON public.balance_adjustments FOR ALL
  USING (public.is_secretary(auth.uid()))
  WITH CHECK (public.is_secretary(auth.uid()));

-- church_assets
DROP POLICY IF EXISTS asset_super_all ON public.church_assets;
CREATE POLICY asset_super_select ON public.church_assets FOR SELECT
  USING (public.is_super_admin(auth.uid()));
CREATE POLICY asset_secretary_all ON public.church_assets FOR ALL
  USING (public.is_secretary(auth.uid()))
  WITH CHECK (public.is_secretary(auth.uid()));

-- asset_requests
DROP POLICY IF EXISTS ar_super_all ON public.asset_requests;
CREATE POLICY ar_super_select ON public.asset_requests FOR SELECT
  USING (public.is_super_admin(auth.uid()));
CREATE POLICY ar_secretary_all ON public.asset_requests FOR ALL
  USING (public.is_secretary(auth.uid()))
  WITH CHECK (public.is_secretary(auth.uid()));

-- attendances
DROP POLICY IF EXISTS att_super_all ON public.attendances;
CREATE POLICY att_super_select ON public.attendances FOR SELECT
  USING (public.is_super_admin(auth.uid()));
CREATE POLICY att_secretary_all ON public.attendances FOR ALL
  USING (public.is_secretary(auth.uid()))
  WITH CHECK (public.is_secretary(auth.uid()));

-- visitors
DROP POLICY IF EXISTS visitors_super_all ON public.visitors;
CREATE POLICY visitors_super_select ON public.visitors FOR SELECT
  USING (public.is_super_admin(auth.uid()));
CREATE POLICY visitors_secretary_all ON public.visitors FOR ALL
  USING (public.is_secretary(auth.uid()))
  WITH CHECK (public.is_secretary(auth.uid()));

-- visitor_followups
DROP POLICY IF EXISTS followups_super_all ON public.visitor_followups;
CREATE POLICY followups_super_select ON public.visitor_followups FOR SELECT
  USING (public.is_super_admin(auth.uid()));
CREATE POLICY followups_secretary_all ON public.visitor_followups FOR ALL
  USING (public.is_secretary(auth.uid()))
  WITH CHECK (public.is_secretary(auth.uid()));

-- user_roles / congregations: secretário também gerencia
CREATE POLICY user_roles_secretary_all ON public.user_roles FOR ALL
  USING (public.is_secretary(auth.uid()))
  WITH CHECK (public.is_secretary(auth.uid()));
CREATE POLICY cong_secretary_all ON public.congregations FOR ALL
  USING (public.is_secretary(auth.uid()))
  WITH CHECK (public.is_secretary(auth.uid()));
CREATE POLICY cp_secretary_all ON public.congregation_pastors FOR ALL
  USING (public.is_secretary(auth.uid()))
  WITH CHECK (public.is_secretary(auth.uid()));
