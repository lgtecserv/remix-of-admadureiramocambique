-- Remover constraint antiga
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Adicionar nova constraint com 'message' incluído
ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type = ANY (ARRAY['info', 'success', 'warning', 'error', 'message']));