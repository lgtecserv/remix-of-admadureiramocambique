
-- ============================================================
-- FASE 1: MULTI-CONGREGAÇÃO (corrigida)
-- ============================================================

CREATE TABLE public.congregations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  city text,
  phone text,
  pastor_responsavel_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.congregations TO authenticated;
GRANT ALL ON public.congregations TO service_role;
ALTER TABLE public.congregations ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_congregations_updated_at BEFORE UPDATE ON public.congregations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.congregation_pastors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  congregation_id uuid NOT NULL REFERENCES public.congregations(id) ON DELETE CASCADE,
  pastor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_titular boolean NOT NULL DEFAULT false,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (congregation_id, pastor_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.congregation_pastors TO authenticated;
GRANT ALL ON public.congregation_pastors TO service_role;
ALTER TABLE public.congregation_pastors ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_congregation_pastors_pastor ON public.congregation_pastors(pastor_id);
CREATE INDEX idx_congregation_pastors_cong ON public.congregation_pastors(congregation_id);

-- is_super_admin dinâmico
DROP FUNCTION IF EXISTS public.is_super_admin(text);
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin');
$$;

-- ORDEM CORRETA: profiles ANTES de user_roles
INSERT INTO public.profiles (id, full_name, email)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email,'@',1)), u.email
FROM auth.users u
WHERE u.email IN ('lgtecserv@gmail.com', 'pastorrobertobueno@gmail.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'super_admin'::app_role
FROM auth.users u
WHERE u.email IN ('lgtecserv@gmail.com', 'pastorrobertobueno@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;

-- Congregação Sede
DO $$
DECLARE sede_id uuid;
BEGIN
  SELECT id INTO sede_id FROM public.congregations WHERE name = 'Sede' LIMIT 1;
  IF sede_id IS NULL THEN
    INSERT INTO public.congregations (name, city, active) VALUES ('Sede', 'Maputo', true);
  END IF;
END $$;

-- Adicionar congregation_id
ALTER TABLE public.members            ADD COLUMN congregation_id uuid REFERENCES public.congregations(id);
ALTER TABLE public.visitors           ADD COLUMN congregation_id uuid REFERENCES public.congregations(id);
ALTER TABLE public.visitor_followups  ADD COLUMN congregation_id uuid REFERENCES public.congregations(id);
ALTER TABLE public.attendances        ADD COLUMN congregation_id uuid REFERENCES public.congregations(id);
ALTER TABLE public.tithes             ADD COLUMN congregation_id uuid REFERENCES public.congregations(id);
ALTER TABLE public.offerings          ADD COLUMN congregation_id uuid REFERENCES public.congregations(id);
ALTER TABLE public.expenses           ADD COLUMN congregation_id uuid REFERENCES public.congregations(id);
ALTER TABLE public.balance_adjustments ADD COLUMN congregation_id uuid REFERENCES public.congregations(id);
ALTER TABLE public.church_assets      ADD COLUMN congregation_id uuid REFERENCES public.congregations(id);
ALTER TABLE public.asset_requests     ADD COLUMN congregation_id uuid REFERENCES public.congregations(id);
ALTER TABLE public.user_roles         ADD COLUMN congregation_id uuid REFERENCES public.congregations(id);
ALTER TABLE public.conversations      ADD COLUMN congregation_id uuid REFERENCES public.congregations(id);

-- Backfill Sede
DO $$
DECLARE sede_id uuid;
BEGIN
  SELECT id INTO sede_id FROM public.congregations WHERE name = 'Sede' LIMIT 1;
  UPDATE public.members             SET congregation_id = sede_id WHERE congregation_id IS NULL;
  UPDATE public.visitors            SET congregation_id = sede_id WHERE congregation_id IS NULL;
  UPDATE public.visitor_followups   SET congregation_id = sede_id WHERE congregation_id IS NULL;
  UPDATE public.attendances         SET congregation_id = sede_id WHERE congregation_id IS NULL;
  UPDATE public.tithes              SET congregation_id = sede_id WHERE congregation_id IS NULL;
  UPDATE public.offerings           SET congregation_id = sede_id WHERE congregation_id IS NULL;
  UPDATE public.expenses            SET congregation_id = sede_id WHERE congregation_id IS NULL;
  UPDATE public.balance_adjustments SET congregation_id = sede_id WHERE congregation_id IS NULL;
  UPDATE public.church_assets       SET congregation_id = sede_id WHERE congregation_id IS NULL;
  UPDATE public.asset_requests      SET congregation_id = sede_id WHERE congregation_id IS NULL;
  UPDATE public.user_roles SET congregation_id = sede_id
    WHERE congregation_id IS NULL AND role IN ('leader','pastor');
  UPDATE public.conversations SET congregation_id = sede_id
    WHERE congregation_id IS NULL AND type = 'general';

  INSERT INTO public.congregation_pastors (congregation_id, pastor_id, is_titular)
  SELECT sede_id, ur.user_id, true FROM public.user_roles ur WHERE ur.role = 'pastor'
  ON CONFLICT (congregation_id, pastor_id) DO NOTHING;

  UPDATE public.congregations
    SET pastor_responsavel_id = (SELECT user_id FROM public.user_roles WHERE role='pastor' LIMIT 1)
    WHERE id = sede_id AND pastor_responsavel_id IS NULL;
END $$;

-- NOT NULL onde aplicável
ALTER TABLE public.members             ALTER COLUMN congregation_id SET NOT NULL;
ALTER TABLE public.visitors            ALTER COLUMN congregation_id SET NOT NULL;
ALTER TABLE public.attendances         ALTER COLUMN congregation_id SET NOT NULL;
ALTER TABLE public.tithes              ALTER COLUMN congregation_id SET NOT NULL;
ALTER TABLE public.offerings           ALTER COLUMN congregation_id SET NOT NULL;
ALTER TABLE public.expenses            ALTER COLUMN congregation_id SET NOT NULL;
ALTER TABLE public.church_assets       ALTER COLUMN congregation_id SET NOT NULL;

-- Índices
CREATE INDEX idx_members_congregation     ON public.members(congregation_id);
CREATE INDEX idx_visitors_congregation    ON public.visitors(congregation_id);
CREATE INDEX idx_attendances_congregation ON public.attendances(congregation_id);
CREATE INDEX idx_tithes_congregation      ON public.tithes(congregation_id);
CREATE INDEX idx_offerings_congregation   ON public.offerings(congregation_id);
CREATE INDEX idx_expenses_congregation    ON public.expenses(congregation_id);
CREATE INDEX idx_church_assets_congregation ON public.church_assets(congregation_id);
CREATE INDEX idx_user_roles_congregation  ON public.user_roles(congregation_id);

-- Helpers de acesso
CREATE OR REPLACE FUNCTION public.get_user_congregations(_user_id uuid)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cp.congregation_id FROM public.congregation_pastors cp WHERE cp.pastor_id = _user_id
  UNION
  SELECT ur.congregation_id FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.role = 'leader' AND ur.congregation_id IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.user_has_access_to_congregation(_user_id uuid, _congregation_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user_id)
    OR EXISTS (SELECT 1 FROM public.get_user_congregations(_user_id) gc WHERE gc = _congregation_id);
$$;

CREATE OR REPLACE FUNCTION public.get_leader_congregation(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT congregation_id FROM public.user_roles WHERE user_id = _user_id AND role = 'leader' LIMIT 1;
$$;

-- RLS congregations
CREATE POLICY "cong_super_all" ON public.congregations FOR ALL
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "cong_self_select" ON public.congregations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.congregation_pastors cp WHERE cp.congregation_id = id AND cp.pastor_id = auth.uid())
    OR public.get_leader_congregation(auth.uid()) = id
  );

CREATE POLICY "cp_super_all" ON public.congregation_pastors FOR ALL
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "cp_self_select" ON public.congregation_pastors FOR SELECT
  USING (pastor_id = auth.uid());

-- MEMBERS
DROP POLICY IF EXISTS "Leaders can view own department members" ON public.members;
DROP POLICY IF EXISTS "Leaders can insert members in own department" ON public.members;
DROP POLICY IF EXISTS "Leaders can update own department members" ON public.members;
DROP POLICY IF EXISTS "Leaders can delete own department members" ON public.members;
DROP POLICY IF EXISTS "Pastor can manage all members" ON public.members;
DROP POLICY IF EXISTS "Super admin can manage all members" ON public.members;
DROP POLICY IF EXISTS "Pastores podem ver todos os membros" ON public.members;
DROP POLICY IF EXISTS "Pastor pode gerenciar todos os membros" ON public.members;
CREATE POLICY "members_super_all" ON public.members FOR ALL
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "members_pastor_all" ON public.members FOR ALL
  USING (has_role(auth.uid(),'pastor'::app_role) AND public.user_has_access_to_congregation(auth.uid(), congregation_id))
  WITH CHECK (has_role(auth.uid(),'pastor'::app_role) AND public.user_has_access_to_congregation(auth.uid(), congregation_id));
CREATE POLICY "members_leader_select" ON public.members FOR SELECT
  USING (has_role(auth.uid(),'leader'::app_role) AND department = get_user_department(auth.uid()) AND congregation_id = get_leader_congregation(auth.uid()));
CREATE POLICY "members_leader_insert" ON public.members FOR INSERT
  WITH CHECK (has_role(auth.uid(),'leader'::app_role) AND department = get_user_department(auth.uid()) AND congregation_id = get_leader_congregation(auth.uid()) AND leader_id = auth.uid());
CREATE POLICY "members_leader_update" ON public.members FOR UPDATE
  USING (has_role(auth.uid(),'leader'::app_role) AND leader_id = auth.uid() AND congregation_id = get_leader_congregation(auth.uid()));
CREATE POLICY "members_leader_delete" ON public.members FOR DELETE
  USING (has_role(auth.uid(),'leader'::app_role) AND leader_id = auth.uid() AND congregation_id = get_leader_congregation(auth.uid()));

-- VISITORS
DROP POLICY IF EXISTS "Leaders can view own department visitors" ON public.visitors;
DROP POLICY IF EXISTS "Leaders can insert visitors in own department" ON public.visitors;
DROP POLICY IF EXISTS "Leaders can update own department visitors" ON public.visitors;
DROP POLICY IF EXISTS "Leaders can delete own department visitors" ON public.visitors;
DROP POLICY IF EXISTS "Pastor can manage all visitors" ON public.visitors;
DROP POLICY IF EXISTS "Super admin can manage all visitors" ON public.visitors;
CREATE POLICY "visitors_super_all" ON public.visitors FOR ALL
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "visitors_pastor_all" ON public.visitors FOR ALL
  USING (has_role(auth.uid(),'pastor'::app_role) AND public.user_has_access_to_congregation(auth.uid(), congregation_id))
  WITH CHECK (has_role(auth.uid(),'pastor'::app_role) AND public.user_has_access_to_congregation(auth.uid(), congregation_id));
CREATE POLICY "visitors_leader_select" ON public.visitors FOR SELECT
  USING (has_role(auth.uid(),'leader'::app_role) AND department = get_user_department(auth.uid()) AND congregation_id = get_leader_congregation(auth.uid()));
CREATE POLICY "visitors_leader_iud" ON public.visitors FOR ALL
  USING (has_role(auth.uid(),'leader'::app_role) AND leader_id = auth.uid() AND congregation_id = get_leader_congregation(auth.uid()))
  WITH CHECK (has_role(auth.uid(),'leader'::app_role) AND department = get_user_department(auth.uid()) AND leader_id = auth.uid() AND congregation_id = get_leader_congregation(auth.uid()));

-- VISITOR_FOLLOWUPS
DROP POLICY IF EXISTS "Leaders can view own department followups" ON public.visitor_followups;
DROP POLICY IF EXISTS "Leaders can insert followups in own department" ON public.visitor_followups;
DROP POLICY IF EXISTS "Leaders can update own department followups" ON public.visitor_followups;
DROP POLICY IF EXISTS "Leaders can delete own department followups" ON public.visitor_followups;
DROP POLICY IF EXISTS "Pastor can manage all followups" ON public.visitor_followups;
DROP POLICY IF EXISTS "Super admin can manage all followups" ON public.visitor_followups;
CREATE POLICY "followups_super_all" ON public.visitor_followups FOR ALL
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "followups_pastor_all" ON public.visitor_followups FOR ALL
  USING (has_role(auth.uid(),'pastor'::app_role) AND (congregation_id IS NULL OR public.user_has_access_to_congregation(auth.uid(), congregation_id)))
  WITH CHECK (has_role(auth.uid(),'pastor'::app_role) AND public.user_has_access_to_congregation(auth.uid(), congregation_id));
CREATE POLICY "followups_leader_all" ON public.visitor_followups FOR ALL
  USING (has_role(auth.uid(),'leader'::app_role) AND (congregation_id IS NULL OR congregation_id = get_leader_congregation(auth.uid())))
  WITH CHECK (has_role(auth.uid(),'leader'::app_role) AND congregation_id = get_leader_congregation(auth.uid()));

-- ATTENDANCES
DROP POLICY IF EXISTS "Leaders can view own department attendances" ON public.attendances;
DROP POLICY IF EXISTS "Leaders can insert attendances in own department" ON public.attendances;
DROP POLICY IF EXISTS "Leaders can update own department attendances" ON public.attendances;
DROP POLICY IF EXISTS "Leaders can delete own department attendances" ON public.attendances;
DROP POLICY IF EXISTS "Pastor can manage all attendances" ON public.attendances;
DROP POLICY IF EXISTS "Super admin can manage all attendances" ON public.attendances;
CREATE POLICY "att_super_all" ON public.attendances FOR ALL
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "att_pastor_all" ON public.attendances FOR ALL
  USING (has_role(auth.uid(),'pastor'::app_role) AND public.user_has_access_to_congregation(auth.uid(), congregation_id))
  WITH CHECK (has_role(auth.uid(),'pastor'::app_role) AND public.user_has_access_to_congregation(auth.uid(), congregation_id));
CREATE POLICY "att_leader_select" ON public.attendances FOR SELECT
  USING (has_role(auth.uid(),'leader'::app_role) AND department = get_user_department(auth.uid()) AND congregation_id = get_leader_congregation(auth.uid()));
CREATE POLICY "att_leader_iud" ON public.attendances FOR ALL
  USING (has_role(auth.uid(),'leader'::app_role) AND leader_id = auth.uid() AND congregation_id = get_leader_congregation(auth.uid()))
  WITH CHECK (has_role(auth.uid(),'leader'::app_role) AND department = get_user_department(auth.uid()) AND leader_id = auth.uid() AND congregation_id = get_leader_congregation(auth.uid()));

-- TITHES
DROP POLICY IF EXISTS "Líder tesouraria pode gerenciar dízimos" ON public.tithes;
DROP POLICY IF EXISTS "Pastor pode ver todos dízimos" ON public.tithes;
DROP POLICY IF EXISTS "Super admin pode gerenciar todos dízimos" ON public.tithes;
CREATE POLICY "tithes_super_all" ON public.tithes FOR ALL
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "tithes_pastor_all" ON public.tithes FOR ALL
  USING (has_role(auth.uid(),'pastor'::app_role) AND public.user_has_access_to_congregation(auth.uid(), congregation_id))
  WITH CHECK (has_role(auth.uid(),'pastor'::app_role) AND public.user_has_access_to_congregation(auth.uid(), congregation_id));
CREATE POLICY "tithes_tesouraria_all" ON public.tithes FOR ALL
  USING (has_role(auth.uid(),'leader'::app_role) AND get_user_department(auth.uid())='tesouraria'::department_type AND congregation_id = get_leader_congregation(auth.uid()))
  WITH CHECK (has_role(auth.uid(),'leader'::app_role) AND get_user_department(auth.uid())='tesouraria'::department_type AND congregation_id = get_leader_congregation(auth.uid()));

-- OFFERINGS
DROP POLICY IF EXISTS "Líder tesouraria pode gerenciar ofertas" ON public.offerings;
DROP POLICY IF EXISTS "Pastor pode ver todas ofertas" ON public.offerings;
DROP POLICY IF EXISTS "Super admin pode gerenciar todas ofertas" ON public.offerings;
CREATE POLICY "off_super_all" ON public.offerings FOR ALL
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "off_pastor_all" ON public.offerings FOR ALL
  USING (has_role(auth.uid(),'pastor'::app_role) AND public.user_has_access_to_congregation(auth.uid(), congregation_id))
  WITH CHECK (has_role(auth.uid(),'pastor'::app_role) AND public.user_has_access_to_congregation(auth.uid(), congregation_id));
CREATE POLICY "off_tesouraria_all" ON public.offerings FOR ALL
  USING (has_role(auth.uid(),'leader'::app_role) AND get_user_department(auth.uid())='tesouraria'::department_type AND congregation_id = get_leader_congregation(auth.uid()))
  WITH CHECK (has_role(auth.uid(),'leader'::app_role) AND get_user_department(auth.uid())='tesouraria'::department_type AND congregation_id = get_leader_congregation(auth.uid()));

-- EXPENSES
DROP POLICY IF EXISTS "Líder tesouraria pode gerenciar despesas" ON public.expenses;
DROP POLICY IF EXISTS "Pastor pode ver todas despesas" ON public.expenses;
DROP POLICY IF EXISTS "Super admin pode gerenciar todas despesas" ON public.expenses;
CREATE POLICY "exp_super_all" ON public.expenses FOR ALL
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "exp_pastor_all" ON public.expenses FOR ALL
  USING (has_role(auth.uid(),'pastor'::app_role) AND public.user_has_access_to_congregation(auth.uid(), congregation_id))
  WITH CHECK (has_role(auth.uid(),'pastor'::app_role) AND public.user_has_access_to_congregation(auth.uid(), congregation_id));
CREATE POLICY "exp_tesouraria_all" ON public.expenses FOR ALL
  USING (has_role(auth.uid(),'leader'::app_role) AND get_user_department(auth.uid())='tesouraria'::department_type AND congregation_id = get_leader_congregation(auth.uid()))
  WITH CHECK (has_role(auth.uid(),'leader'::app_role) AND get_user_department(auth.uid())='tesouraria'::department_type AND congregation_id = get_leader_congregation(auth.uid()));

-- BALANCE_ADJUSTMENTS
DROP POLICY IF EXISTS "Líder tesouraria pode gerenciar ajustes" ON public.balance_adjustments;
DROP POLICY IF EXISTS "Pastor pode ver todos ajustes" ON public.balance_adjustments;
DROP POLICY IF EXISTS "Super admin pode gerenciar todos ajustes" ON public.balance_adjustments;
CREATE POLICY "bal_super_all" ON public.balance_adjustments FOR ALL
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "bal_pastor_all" ON public.balance_adjustments FOR ALL
  USING (has_role(auth.uid(),'pastor'::app_role) AND (congregation_id IS NULL OR public.user_has_access_to_congregation(auth.uid(), congregation_id)))
  WITH CHECK (has_role(auth.uid(),'pastor'::app_role) AND public.user_has_access_to_congregation(auth.uid(), congregation_id));
CREATE POLICY "bal_tesouraria_all" ON public.balance_adjustments FOR ALL
  USING (has_role(auth.uid(),'leader'::app_role) AND get_user_department(auth.uid())='tesouraria'::department_type AND (congregation_id IS NULL OR congregation_id = get_leader_congregation(auth.uid())))
  WITH CHECK (has_role(auth.uid(),'leader'::app_role) AND get_user_department(auth.uid())='tesouraria'::department_type AND congregation_id = get_leader_congregation(auth.uid()));

-- CHURCH_ASSETS
DROP POLICY IF EXISTS "Líder patrimônio pode gerenciar seus assets" ON public.church_assets;
DROP POLICY IF EXISTS "Pastor pode gerenciar todos assets" ON public.church_assets;
DROP POLICY IF EXISTS "Super admin pode gerenciar todos assets" ON public.church_assets;
DROP POLICY IF EXISTS "Tesouraria pode ver todos assets" ON public.church_assets;
CREATE POLICY "asset_super_all" ON public.church_assets FOR ALL
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "asset_pastor_all" ON public.church_assets FOR ALL
  USING (has_role(auth.uid(),'pastor'::app_role) AND public.user_has_access_to_congregation(auth.uid(), congregation_id))
  WITH CHECK (has_role(auth.uid(),'pastor'::app_role) AND public.user_has_access_to_congregation(auth.uid(), congregation_id));
CREATE POLICY "asset_patrimonio_all" ON public.church_assets FOR ALL
  USING (has_role(auth.uid(),'leader'::app_role) AND get_user_department(auth.uid())='patrimonio'::department_type AND congregation_id = get_leader_congregation(auth.uid()))
  WITH CHECK (has_role(auth.uid(),'leader'::app_role) AND get_user_department(auth.uid())='patrimonio'::department_type AND congregation_id = get_leader_congregation(auth.uid()) AND leader_id = auth.uid());
CREATE POLICY "asset_tesouraria_select" ON public.church_assets FOR SELECT
  USING (has_role(auth.uid(),'leader'::app_role) AND get_user_department(auth.uid())='tesouraria'::department_type AND congregation_id = get_leader_congregation(auth.uid()));

-- ASSET_REQUESTS
DROP POLICY IF EXISTS "Líder patrimônio pode gerenciar suas solicitações" ON public.asset_requests;
DROP POLICY IF EXISTS "Pastor pode ver todas solicitações" ON public.asset_requests;
DROP POLICY IF EXISTS "Super admin pode gerenciar todas solicitações" ON public.asset_requests;
DROP POLICY IF EXISTS "Tesouraria pode aprovar solicitações" ON public.asset_requests;
DROP POLICY IF EXISTS "Tesouraria pode ver todas solicitações" ON public.asset_requests;
CREATE POLICY "ar_super_all" ON public.asset_requests FOR ALL
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "ar_pastor_select" ON public.asset_requests FOR SELECT
  USING (has_role(auth.uid(),'pastor'::app_role) AND (congregation_id IS NULL OR public.user_has_access_to_congregation(auth.uid(), congregation_id)));
CREATE POLICY "ar_patrimonio_all" ON public.asset_requests FOR ALL
  USING (has_role(auth.uid(),'leader'::app_role) AND get_user_department(auth.uid())='patrimonio'::department_type AND requested_by = auth.uid())
  WITH CHECK (has_role(auth.uid(),'leader'::app_role) AND get_user_department(auth.uid())='patrimonio'::department_type AND requested_by = auth.uid());
CREATE POLICY "ar_tesouraria_select" ON public.asset_requests FOR SELECT
  USING (has_role(auth.uid(),'leader'::app_role) AND get_user_department(auth.uid())='tesouraria'::department_type);
CREATE POLICY "ar_tesouraria_update" ON public.asset_requests FOR UPDATE
  USING (has_role(auth.uid(),'leader'::app_role) AND get_user_department(auth.uid())='tesouraria'::department_type);

-- add_leader_to_general_chat (general por congregação)
CREATE OR REPLACE FUNCTION public.add_leader_to_general_chat()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  general_conv_id UUID;
  target_cong UUID;
BEGIN
  IF NEW.role IN ('leader','pastor') AND NEW.congregation_id IS NOT NULL THEN
    target_cong := NEW.congregation_id;
    SELECT id INTO general_conv_id FROM conversations
      WHERE type = 'general' AND congregation_id = target_cong LIMIT 1;
    IF general_conv_id IS NULL THEN
      INSERT INTO conversations (type, name, congregation_id)
      VALUES ('general', 'Chat Geral', target_cong)
      RETURNING id INTO general_conv_id;
    END IF;
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES (general_conv_id, NEW.user_id) ON CONFLICT DO NOTHING;
  END IF;
  IF NEW.role = 'super_admin' THEN
    FOR general_conv_id IN SELECT id FROM conversations WHERE type='general' LOOP
      INSERT INTO conversation_participants (conversation_id, user_id)
      VALUES (general_conv_id, NEW.user_id) ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

-- Garantir chat geral da Sede
DO $$
DECLARE sede_id uuid; gen_id uuid;
BEGIN
  SELECT id INTO sede_id FROM public.congregations WHERE name='Sede' LIMIT 1;
  SELECT id INTO gen_id FROM public.conversations WHERE type='general' AND congregation_id = sede_id LIMIT 1;
  IF gen_id IS NULL THEN
    INSERT INTO public.conversations (type, name, congregation_id)
    VALUES ('general', 'Chat Geral', sede_id) RETURNING id INTO gen_id;
  END IF;
  INSERT INTO public.conversation_participants (conversation_id, user_id)
    SELECT gen_id, ur.user_id FROM public.user_roles ur
    WHERE ur.role IN ('leader','pastor') AND ur.congregation_id = sede_id
    ON CONFLICT DO NOTHING;
  INSERT INTO public.conversation_participants (conversation_id, user_id)
    SELECT gen_id, ur.user_id FROM public.user_roles ur WHERE ur.role='super_admin'
    ON CONFLICT DO NOTHING;
END $$;
