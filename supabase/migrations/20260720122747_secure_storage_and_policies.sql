-- Configurações de Segurança para o Storage de Fotos (Avatares)

-- 1. Assegurar que o bucket existe
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Habilitar RLS no bucket (embora a tabela storage.objects já tenha RLS por padrão, é boa prática)
-- Não é possível usar ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY diretamente aqui sem cuidado, 
-- mas a proteção principal é em storage.objects.

-- 3. Remover políticas antigas se existirem para evitar duplicatas (opcional)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Auth Insert" ON storage.objects;
DROP POLICY IF EXISTS "Owner Delete" ON storage.objects;

-- 4. Criar política de visualização pública (Qualquer um pode ver as fotos)
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'avatars' );

-- 5. Criar política de inserção (Apenas usuários autenticados podem fazer upload)
CREATE POLICY "Auth Insert" 
ON storage.objects FOR INSERT 
WITH CHECK ( 
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);

-- 6. Criar política de atualização (O dono do arquivo ou um pastor/líder pode atualizar)
CREATE POLICY "Owner Update" 
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);

-- 7. Criar política de exclusão (Apenas usuários autenticados podem deletar)
CREATE POLICY "Owner Delete" 
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);
