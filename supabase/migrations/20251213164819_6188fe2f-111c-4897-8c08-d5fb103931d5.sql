-- Adicionar novos campos à tabela members
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS member_type text DEFAULT 'membro';
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS photo_url text;

-- Criar bucket para fotos de membros
INSERT INTO storage.buckets (id, name, public) 
VALUES ('member-photos', 'member-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para o bucket member-photos
CREATE POLICY "Leaders can upload member photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'member-photos' AND
  (has_role(auth.uid(), 'leader') OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'super_admin'))
);

CREATE POLICY "Leaders can view member photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'member-photos' AND
  (has_role(auth.uid(), 'leader') OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'super_admin'))
);

CREATE POLICY "Leaders can update member photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'member-photos' AND
  (has_role(auth.uid(), 'leader') OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'super_admin'))
);

CREATE POLICY "Leaders can delete member photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'member-photos' AND
  (has_role(auth.uid(), 'leader') OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'super_admin'))
);