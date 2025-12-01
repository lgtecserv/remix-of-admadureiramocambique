-- Adicionar RLS policy para Tesouraria ver todos os materiais do patrimônio
CREATE POLICY "Tesouraria pode ver todos assets"
ON church_assets FOR SELECT
USING (
  has_role(auth.uid(), 'leader'::app_role) 
  AND get_user_department(auth.uid()) = 'tesouraria'::department_type
);

-- Adicionar RLS policy para Tesouraria aprovar/rejeitar solicitações
CREATE POLICY "Tesouraria pode aprovar solicitações"
ON asset_requests FOR UPDATE
USING (
  has_role(auth.uid(), 'leader'::app_role) 
  AND get_user_department(auth.uid()) = 'tesouraria'::department_type
);