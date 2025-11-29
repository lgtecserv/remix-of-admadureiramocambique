-- Fase 1: Correções de Banco de Dados

-- 1.1 Adicionar colunas na tabela church_assets
ALTER TABLE church_assets
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS observations TEXT;

-- 1.2 Adicionar coluna na tabela asset_requests
ALTER TABLE asset_requests
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 1.3 Adicionar coluna na tabela offerings
ALTER TABLE offerings
ADD COLUMN IF NOT EXISTS verified_by_names TEXT[];

-- 1.4 Adicionar coluna na tabela tithes
ALTER TABLE tithes
ADD COLUMN IF NOT EXISTS tithe_month INTEGER NOT NULL DEFAULT EXTRACT(MONTH FROM CURRENT_DATE);

-- 1.5 Criar bucket de storage para imagens de assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO NOTHING;

-- 1.6 RLS policies para o bucket assets
CREATE POLICY "Qualquer um pode visualizar assets públicos"
ON storage.objects FOR SELECT
USING (bucket_id = 'assets');

CREATE POLICY "Leaders patrimonio podem fazer upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'assets' 
  AND (
    has_role(auth.uid(), 'leader'::app_role) 
    AND get_user_department(auth.uid()) = 'patrimonio'::department_type
  )
  OR has_role(auth.uid(), 'pastor'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Leaders patrimonio podem deletar assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'assets' 
  AND (
    has_role(auth.uid(), 'leader'::app_role) 
    AND get_user_department(auth.uid()) = 'patrimonio'::department_type
  )
  OR has_role(auth.uid(), 'pastor'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);