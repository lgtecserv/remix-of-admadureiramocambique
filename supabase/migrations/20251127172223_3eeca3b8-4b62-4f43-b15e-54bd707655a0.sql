-- FASE 1: Permitir líderes ver roles de outros líderes/pastores para chat
CREATE POLICY "Leaders can view leader and pastor roles for chat"
ON public.user_roles
FOR SELECT
USING (
  role IN ('leader', 'pastor')
  AND
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('leader', 'pastor', 'super_admin')
  )
);

-- FASE 3: Criar tabela para push subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own subscriptions"
ON public.push_subscriptions
FOR ALL
USING (user_id = auth.uid());