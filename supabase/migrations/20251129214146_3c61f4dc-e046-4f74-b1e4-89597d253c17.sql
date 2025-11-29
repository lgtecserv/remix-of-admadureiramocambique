-- Criar tabela para ajustes de saldo
CREATE TABLE IF NOT EXISTS public.balance_adjustments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL,
  adjustment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.balance_adjustments ENABLE ROW LEVEL SECURITY;

-- Políticas para balance_adjustments
CREATE POLICY "Líder tesouraria pode gerenciar ajustes"
ON public.balance_adjustments
FOR ALL
USING (
  has_role(auth.uid(), 'leader'::app_role) AND 
  get_user_department(auth.uid()) = 'tesouraria'::department_type
);

CREATE POLICY "Pastor pode ver todos ajustes"
ON public.balance_adjustments
FOR SELECT
USING (has_role(auth.uid(), 'pastor'::app_role));

CREATE POLICY "Super admin pode gerenciar todos ajustes"
ON public.balance_adjustments
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Adicionar coluna de comentário em asset_requests
ALTER TABLE public.asset_requests 
ADD COLUMN IF NOT EXISTS approval_comment TEXT;

-- Adicionar trigger para updated_at em balance_adjustments
CREATE TRIGGER update_balance_adjustments_updated_at
BEFORE UPDATE ON public.balance_adjustments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();