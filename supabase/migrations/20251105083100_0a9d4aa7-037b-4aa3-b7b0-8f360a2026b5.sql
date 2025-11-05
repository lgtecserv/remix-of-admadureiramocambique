-- Remover a policy atual que permite líderes deletarem membros
DROP POLICY IF EXISTS "Leaders can delete own department members" ON public.members;

-- Criar nova policy permitindo APENAS pastor deletar membros
CREATE POLICY "Only pastor can delete members" 
ON public.members 
FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'pastor'::app_role));