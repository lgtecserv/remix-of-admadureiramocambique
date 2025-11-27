-- Criar tabela church_assets (Materiais da Igreja - Patrimônio)
CREATE TABLE public.church_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  condition TEXT NOT NULL CHECK (condition IN ('perfeito', 'danificado')),
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  leader_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela asset_requests (Solicitações de Uso - Patrimônio)
CREATE TABLE public.asset_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.church_assets(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  purpose TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela offerings (Ofertas - Tesouraria)
CREATE TABLE public.offerings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_date DATE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  event_type TEXT NOT NULL,
  notes TEXT,
  recorded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela tithes (Dízimos - Tesouraria)
CREATE TABLE public.tithes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  tithe_date DATE NOT NULL,
  recorded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela expenses (Gastos - Tesouraria)
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  expense_date DATE NOT NULL,
  category TEXT NOT NULL,
  recorded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índices para melhor performance
CREATE INDEX idx_church_assets_leader_id ON public.church_assets(leader_id);
CREATE INDEX idx_asset_requests_asset_id ON public.asset_requests(asset_id);
CREATE INDEX idx_asset_requests_requested_by ON public.asset_requests(requested_by);
CREATE INDEX idx_asset_requests_status ON public.asset_requests(status);
CREATE INDEX idx_offerings_event_date ON public.offerings(event_date);
CREATE INDEX idx_offerings_recorded_by ON public.offerings(recorded_by);
CREATE INDEX idx_tithes_member_id ON public.tithes(member_id);
CREATE INDEX idx_tithes_tithe_date ON public.tithes(tithe_date);
CREATE INDEX idx_tithes_recorded_by ON public.tithes(recorded_by);
CREATE INDEX idx_expenses_expense_date ON public.expenses(expense_date);
CREATE INDEX idx_expenses_recorded_by ON public.expenses(recorded_by);
CREATE INDEX idx_expenses_category ON public.expenses(category);

-- Triggers para updated_at
CREATE TRIGGER update_church_assets_updated_at
BEFORE UPDATE ON public.church_assets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_asset_requests_updated_at
BEFORE UPDATE ON public.asset_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_offerings_updated_at
BEFORE UPDATE ON public.offerings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tithes_updated_at
BEFORE UPDATE ON public.tithes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ===== RLS POLICIES =====

-- Enable RLS em todas as tabelas
ALTER TABLE public.church_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tithes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- ===== CHURCH_ASSETS POLICIES =====

-- Líder do patrimônio pode gerenciar seus assets
CREATE POLICY "Líder patrimônio pode gerenciar seus assets"
ON public.church_assets
FOR ALL
USING (
  has_role(auth.uid(), 'leader'::app_role) 
  AND get_user_department(auth.uid()) = 'patrimonio'::department_type
  AND leader_id = auth.uid()
);

-- Pastor pode ver e gerenciar todos os assets
CREATE POLICY "Pastor pode gerenciar todos assets"
ON public.church_assets
FOR ALL
USING (has_role(auth.uid(), 'pastor'::app_role));

-- Super admin pode gerenciar todos os assets
CREATE POLICY "Super admin pode gerenciar todos assets"
ON public.church_assets
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- ===== ASSET_REQUESTS POLICIES =====

-- Líder do patrimônio pode gerenciar suas solicitações
CREATE POLICY "Líder patrimônio pode gerenciar suas solicitações"
ON public.asset_requests
FOR ALL
USING (
  has_role(auth.uid(), 'leader'::app_role) 
  AND get_user_department(auth.uid()) = 'patrimonio'::department_type
  AND requested_by = auth.uid()
);

-- Pastor pode ver todas as solicitações
CREATE POLICY "Pastor pode ver todas solicitações"
ON public.asset_requests
FOR SELECT
USING (has_role(auth.uid(), 'pastor'::app_role));

-- Tesouraria pode ver todas as solicitações
CREATE POLICY "Tesouraria pode ver todas solicitações"
ON public.asset_requests
FOR SELECT
USING (
  has_role(auth.uid(), 'leader'::app_role) 
  AND get_user_department(auth.uid()) = 'tesouraria'::department_type
);

-- Super admin pode gerenciar todas as solicitações
CREATE POLICY "Super admin pode gerenciar todas solicitações"
ON public.asset_requests
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- ===== OFFERINGS POLICIES =====

-- Líder da tesouraria pode gerenciar ofertas
CREATE POLICY "Líder tesouraria pode gerenciar ofertas"
ON public.offerings
FOR ALL
USING (
  has_role(auth.uid(), 'leader'::app_role) 
  AND get_user_department(auth.uid()) = 'tesouraria'::department_type
);

-- Pastor pode ver todas as ofertas
CREATE POLICY "Pastor pode ver todas ofertas"
ON public.offerings
FOR SELECT
USING (has_role(auth.uid(), 'pastor'::app_role));

-- Super admin pode gerenciar todas as ofertas
CREATE POLICY "Super admin pode gerenciar todas ofertas"
ON public.offerings
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- ===== TITHES POLICIES =====

-- Líder da tesouraria pode gerenciar dízimos
CREATE POLICY "Líder tesouraria pode gerenciar dízimos"
ON public.tithes
FOR ALL
USING (
  has_role(auth.uid(), 'leader'::app_role) 
  AND get_user_department(auth.uid()) = 'tesouraria'::department_type
);

-- Pastor pode ver todos os dízimos
CREATE POLICY "Pastor pode ver todos dízimos"
ON public.tithes
FOR SELECT
USING (has_role(auth.uid(), 'pastor'::app_role));

-- Super admin pode gerenciar todos os dízimos
CREATE POLICY "Super admin pode gerenciar todos dízimos"
ON public.tithes
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- ===== EXPENSES POLICIES =====

-- Líder da tesouraria pode gerenciar gastos
CREATE POLICY "Líder tesouraria pode gerenciar gastos"
ON public.expenses
FOR ALL
USING (
  has_role(auth.uid(), 'leader'::app_role) 
  AND get_user_department(auth.uid()) = 'tesouraria'::department_type
);

-- Pastor pode ver todos os gastos
CREATE POLICY "Pastor pode ver todos gastos"
ON public.expenses
FOR SELECT
USING (has_role(auth.uid(), 'pastor'::app_role));

-- Super admin pode gerenciar todos os gastos
CREATE POLICY "Super admin pode gerenciar todos gastos"
ON public.expenses
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- ===== TRIGGER PARA NOTIFICAÇÕES DE SOLICITAÇÕES =====

-- Função para notificar quando uma solicitação é criada
CREATE OR REPLACE FUNCTION public.notify_asset_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_id UUID;
  requester_name TEXT;
  asset_name TEXT;
BEGIN
  -- Buscar nome do solicitante
  SELECT full_name INTO requester_name 
  FROM profiles 
  WHERE id = NEW.requested_by;
  
  -- Buscar nome do asset
  SELECT name INTO asset_name 
  FROM church_assets 
  WHERE id = NEW.asset_id;
  
  -- Notificar pastores
  FOR recipient_id IN 
    SELECT user_id 
    FROM user_roles 
    WHERE role = 'pastor'
  LOOP
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      recipient_id,
      'Nova Solicitação de Patrimônio',
      COALESCE(requester_name, 'Usuário') || ' solicitou ' || NEW.quantity || ' unidade(s) de ' || COALESCE(asset_name, 'item'),
      'warning',
      '/chat'
    );
  END LOOP;
  
  -- Notificar tesouraria
  FOR recipient_id IN 
    SELECT user_id 
    FROM user_roles 
    WHERE role = 'leader' AND department = 'tesouraria'
  LOOP
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      recipient_id,
      'Nova Solicitação de Patrimônio',
      COALESCE(requester_name, 'Usuário') || ' solicitou ' || NEW.quantity || ' unidade(s) de ' || COALESCE(asset_name, 'item'),
      'warning',
      '/chat'
    );
  END LOOP;
  
  -- Notificar super admin
  FOR recipient_id IN 
    SELECT user_id 
    FROM user_roles 
    WHERE role = 'super_admin'
  LOOP
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      recipient_id,
      'Nova Solicitação de Patrimônio',
      COALESCE(requester_name, 'Usuário') || ' solicitou ' || NEW.quantity || ' unidade(s) de ' || COALESCE(asset_name, 'item'),
      'warning',
      '/chat'
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para notificações
CREATE TRIGGER trigger_notify_asset_request
AFTER INSERT ON public.asset_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_asset_request();