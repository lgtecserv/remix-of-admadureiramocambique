-- Permitir que tesouraria veja todos os membros para registrar dízimos
CREATE POLICY "Tesouraria pode ver todos membros para dízimos"
ON members FOR SELECT
USING (
  has_role(auth.uid(), 'leader'::app_role) 
  AND get_user_department(auth.uid()) = 'tesouraria'::department_type
);