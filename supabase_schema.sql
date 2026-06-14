-- Create role enum
CREATE TYPE public.app_role AS ENUM ('pastor', 'leader');

-- Create department enum
CREATE TYPE public.department_type AS ENUM ('jovens', 'irmas', 'varoes', 'adolescentes', 'criancas');

-- Create member status enum
CREATE TYPE public.member_status AS ENUM ('novo', 'ativo', 'inativo');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  department department_type,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create members table
CREATE TABLE public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  status member_status NOT NULL DEFAULT 'novo',
  department department_type NOT NULL,
  leader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role = _role
  )
$$;

-- Create function to get user department
CREATE OR REPLACE FUNCTION public.get_user_department(_user_id UUID)
RETURNS department_type
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department
  FROM public.user_roles
  WHERE user_id = _user_id
  AND role = 'leader'
  LIMIT 1
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Pastor can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'pastor'));

CREATE POLICY "Leaders can view own role"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Pastor can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'pastor'));

-- RLS Policies for members
CREATE POLICY "Pastor can view all members"
  ON public.members FOR SELECT
  USING (public.has_role(auth.uid(), 'pastor'));

CREATE POLICY "Leaders can view own department members"
  ON public.members FOR SELECT
  USING (
    public.has_role(auth.uid(), 'leader') 
    AND department = public.get_user_department(auth.uid())
  );

CREATE POLICY "Leaders can insert members in own department"
  ON public.members FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'leader')
    AND department = public.get_user_department(auth.uid())
    AND leader_id = auth.uid()
  );

CREATE POLICY "Leaders can update own department members"
  ON public.members FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'leader')
    AND leader_id = auth.uid()
  );

CREATE POLICY "Leaders can delete own department members"
  ON public.members FOR DELETE
  USING (
    public.has_role(auth.uid(), 'leader')
    AND leader_id = auth.uid()
  );

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_members_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();



-- 1. Adicionar coluna email na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Atualizar trigger para salvar email no perfil
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- 3. Adicionar RLS policy para pastor deletar membros
CREATE POLICY "Pastor can delete all members"
ON public.members
FOR DELETE
USING (has_role(auth.uid(), 'pastor'::app_role));

-- 4. Criar tabela de visitantes
CREATE TABLE IF NOT EXISTS public.visitors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  invited_by TEXT,
  observations TEXT,
  returned BOOLEAN NOT NULL DEFAULT false,
  leader_id UUID NOT NULL,
  department department_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Enable RLS na tabela visitors
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies para visitors
CREATE POLICY "Leaders can view own department visitors"
ON public.visitors
FOR SELECT
USING (
  has_role(auth.uid(), 'leader'::app_role) 
  AND department = get_user_department(auth.uid())
);

CREATE POLICY "Leaders can insert visitors in own department"
ON public.visitors
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'leader'::app_role)
  AND department = get_user_department(auth.uid())
  AND leader_id = auth.uid()
);

CREATE POLICY "Leaders can update own department visitors"
ON public.visitors
FOR UPDATE
USING (
  has_role(auth.uid(), 'leader'::app_role)
  AND leader_id = auth.uid()
);

CREATE POLICY "Leaders can delete own department visitors"
ON public.visitors
FOR DELETE
USING (
  has_role(auth.uid(), 'leader'::app_role)
  AND leader_id = auth.uid()
);

CREATE POLICY "Pastor can view all visitors"
ON public.visitors
FOR SELECT
USING (has_role(auth.uid(), 'pastor'::app_role));

CREATE POLICY "Pastor can manage all visitors"
ON public.visitors
FOR ALL
USING (has_role(auth.uid(), 'pastor'::app_role));

-- 7. Trigger para atualizar updated_at em visitors
CREATE TRIGGER update_visitors_updated_at
BEFORE UPDATE ON public.visitors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();



-- Migration 1: Popular emails faltantes dos lÃ­deres
-- Atualizar profiles com emails de auth.users para lÃ­deres sem email
UPDATE public.profiles
SET email = auth.users.email
FROM auth.users
WHERE profiles.id = auth.users.id
  AND profiles.email IS NULL;

-- Migration 2: Criar funÃ§Ã£o para verificar super-admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_email text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN _email = 'lgtecserv@gmail.com';
END;
$$;

-- Criar polÃ­tica RLS para permitir super-admin gerenciar roles de pastores
CREATE POLICY "Super admin can manage pastor roles"
ON public.user_roles
FOR ALL
USING (
  is_super_admin((SELECT email FROM auth.users WHERE id = auth.uid()))
);

-- Adicionar Ã­ndice para performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);



-- Fix 1: Drop problematic RLS policy that queries auth.users
DROP POLICY IF EXISTS "Super admin can manage pastor roles" ON public.user_roles;

-- Fix 2: Recreate is_super_admin function to check profiles table instead of auth.users
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = _user_id 
    AND email = 'lgtecserv@gmail.com'
  );
END;
$$;

-- Fix 3: Recreate the policy using the corrected function
CREATE POLICY "Super admin can manage pastor roles"
ON public.user_roles
FOR ALL
USING (public.is_super_admin(auth.uid()));



-- Add new fields to members table
ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS marital_status TEXT CHECK (marital_status IN ('solteiro', 'casado', 'divorciado', 'viuvo')),
ADD COLUMN IF NOT EXISTS occupation TEXT,
ADD COLUMN IF NOT EXISTS baptism_date DATE,
ADD COLUMN IF NOT EXISTS observations TEXT;

-- Create attendances table for tracking service/event attendance
CREATE TABLE IF NOT EXISTS public.attendances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
  visitor_id UUID REFERENCES public.visitors(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('culto', 'celula', 'evento_especial')),
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  department DEPARTMENT_TYPE NOT NULL,
  leader_id UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT attendance_person_check CHECK (
    (member_id IS NOT NULL AND visitor_id IS NULL) OR 
    (member_id IS NULL AND visitor_id IS NOT NULL)
  )
);

ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;

-- RLS policies for attendances
CREATE POLICY "Pastor can manage all attendances"
ON public.attendances FOR ALL
USING (has_role(auth.uid(), 'pastor'::app_role));

CREATE POLICY "Leaders can view own department attendances"
ON public.attendances FOR SELECT
USING (
  has_role(auth.uid(), 'leader'::app_role) AND 
  department = get_user_department(auth.uid())
);

CREATE POLICY "Leaders can insert attendances in own department"
ON public.attendances FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'leader'::app_role) AND 
  department = get_user_department(auth.uid()) AND 
  leader_id = auth.uid()
);

CREATE POLICY "Leaders can update own department attendances"
ON public.attendances FOR UPDATE
USING (
  has_role(auth.uid(), 'leader'::app_role) AND 
  leader_id = auth.uid()
);

CREATE POLICY "Leaders can delete own department attendances"
ON public.attendances FOR DELETE
USING (
  has_role(auth.uid(), 'leader'::app_role) AND 
  leader_id = auth.uid()
);

-- Create visitor_followups table
CREATE TABLE IF NOT EXISTS public.visitor_followups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id UUID NOT NULL REFERENCES public.visitors(id) ON DELETE CASCADE,
  followup_date DATE NOT NULL DEFAULT CURRENT_DATE,
  followup_type TEXT NOT NULL CHECK (followup_type IN ('ligacao', 'whatsapp', 'visita', 'email')),
  status TEXT NOT NULL CHECK (status IN ('pendente', 'realizado', 'sem_sucesso')),
  notes TEXT,
  leader_id UUID NOT NULL,
  department DEPARTMENT_TYPE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.visitor_followups ENABLE ROW LEVEL SECURITY;

-- RLS policies for visitor_followups
CREATE POLICY "Pastor can manage all followups"
ON public.visitor_followups FOR ALL
USING (has_role(auth.uid(), 'pastor'::app_role));

CREATE POLICY "Leaders can view own department followups"
ON public.visitor_followups FOR SELECT
USING (
  has_role(auth.uid(), 'leader'::app_role) AND 
  department = get_user_department(auth.uid())
);

CREATE POLICY "Leaders can insert followups in own department"
ON public.visitor_followups FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'leader'::app_role) AND 
  department = get_user_department(auth.uid()) AND 
  leader_id = auth.uid()
);

CREATE POLICY "Leaders can update own followups"
ON public.visitor_followups FOR UPDATE
USING (
  has_role(auth.uid(), 'leader'::app_role) AND 
  leader_id = auth.uid()
);

CREATE POLICY "Leaders can delete own followups"
ON public.visitor_followups FOR DELETE
USING (
  has_role(auth.uid(), 'leader'::app_role) AND 
  leader_id = auth.uid()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
  read BOOLEAN NOT NULL DEFAULT FALSE,
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Pastor can create notifications for everyone"
ON public.notifications FOR INSERT
WITH CHECK (has_role(auth.uid(), 'pastor'::app_role));

-- Create triggers for updated_at
CREATE TRIGGER update_attendances_updated_at
BEFORE UPDATE ON public.attendances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_visitor_followups_updated_at
BEFORE UPDATE ON public.visitor_followups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attendances_event_date ON public.attendances(event_date);
CREATE INDEX IF NOT EXISTS idx_attendances_member_id ON public.attendances(member_id);
CREATE INDEX IF NOT EXISTS idx_attendances_department ON public.attendances(department);
CREATE INDEX IF NOT EXISTS idx_visitor_followups_visitor_id ON public.visitor_followups(visitor_id);
CREATE INDEX IF NOT EXISTS idx_visitor_followups_status ON public.visitor_followups(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);



-- Remover a policy atual que permite lÃ­deres deletarem membros
DROP POLICY IF EXISTS "Leaders can delete own department members" ON public.members;

-- Criar nova policy permitindo APENAS pastor deletar membros
CREATE POLICY "Only pastor can delete members" 
ON public.members 
FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'pastor'::app_role));



-- Add RLS policies to allow pastors and super admin to view all profiles
-- This is needed for LeaderManagement, SuperAdmin, and TransferMembersDialog components
-- which join user_roles with profiles table

-- Allow pastors to view all profiles
CREATE POLICY "Pastor can view all profiles"
  ON public.profiles 
  FOR SELECT
  USING (public.has_role(auth.uid(), 'pastor'::app_role));

-- Allow super admin to view all profiles
CREATE POLICY "Super admin can view all profiles"
  ON public.profiles 
  FOR SELECT
  USING (public.is_super_admin(auth.uid()));

-- Allow leaders to view profiles of other leaders in the same department
-- This is needed for the TransferMembersDialog
CREATE POLICY "Leaders can view same department leader profiles"
  ON public.profiles 
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM public.user_roles ur1
      INNER JOIN public.user_roles ur2 ON ur1.department = ur2.department
      WHERE ur1.user_id = auth.uid()
      AND ur1.role = 'leader'::app_role
      AND ur2.user_id = profiles.id
      AND ur2.role = 'leader'::app_role
    )
  );



-- Step 1: Clean up orphaned records before adding foreign keys
-- Remove user_roles entries without matching profiles
DELETE FROM public.user_roles
WHERE user_id NOT IN (SELECT id FROM public.profiles);

-- Remove members with invalid leader_id
DELETE FROM public.members
WHERE leader_id NOT IN (SELECT id FROM public.profiles);

-- Remove visitors with invalid leader_id
DELETE FROM public.visitors
WHERE leader_id NOT IN (SELECT id FROM public.profiles);

-- Remove visitor_followups with invalid leader_id
DELETE FROM public.visitor_followups
WHERE leader_id NOT IN (SELECT id FROM public.profiles);

-- Remove attendances with invalid leader_id
DELETE FROM public.attendances
WHERE leader_id NOT IN (SELECT id FROM public.profiles);

-- Step 2: Add foreign keys to establish relationships
ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_fk
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.members
  ADD CONSTRAINT members_leader_fk
  FOREIGN KEY (leader_id) REFERENCES public.profiles(id);

ALTER TABLE public.visitors
  ADD CONSTRAINT visitors_leader_fk
  FOREIGN KEY (leader_id) REFERENCES public.profiles(id);

ALTER TABLE public.visitor_followups
  ADD CONSTRAINT visitor_followups_leader_fk
  FOREIGN KEY (leader_id) REFERENCES public.profiles(id);

ALTER TABLE public.attendances
  ADD CONSTRAINT attendances_leader_fk
  FOREIGN KEY (leader_id) REFERENCES public.profiles(id);

-- Step 3: Add RLS policy to allow pastor to update members
CREATE POLICY "Pastor can update all members"
  ON public.members
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'pastor'::app_role));



-- Tabela de conversas
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('general', 'private')),
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de participantes de conversas
CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  last_read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Tabela de mensagens
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  edited_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT false
);

-- Ãndices para performance
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_participants_user ON conversation_participants(user_id);
CREATE INDEX idx_participants_conversation ON conversation_participants(conversation_id);

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;

-- RLS Policies
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- UsuÃ¡rios podem ver conversas das quais participam
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = conversations.id
      AND user_id = auth.uid()
    )
  );

-- UsuÃ¡rios podem ver participantes de suas conversas
CREATE POLICY "Users can view conversation participants"
  ON conversation_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp2
      WHERE cp2.conversation_id = conversation_participants.conversation_id
      AND cp2.user_id = auth.uid()
    )
  );

-- UsuÃ¡rios podem ver mensagens de suas conversas
CREATE POLICY "Users can view messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND user_id = auth.uid()
    )
  );

-- UsuÃ¡rios podem enviar mensagens em conversas que participam
CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND user_id = auth.uid()
    )
  );

-- UsuÃ¡rios podem atualizar suas prÃ³prias mensagens
CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  USING (sender_id = auth.uid());

-- Pastores podem criar conversas gerais
CREATE POLICY "Pastors can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'pastor'::app_role));

-- UsuÃ¡rios podem criar conversas privadas
CREATE POLICY "Users can create private conversations"
  ON conversations FOR INSERT
  WITH CHECK (type = 'private');

-- UsuÃ¡rios podem adicionar participantes em conversas que criaram
CREATE POLICY "Users can add participants"
  ON conversation_participants FOR INSERT
  WITH CHECK (true);

-- UsuÃ¡rios podem atualizar seu last_read_at
CREATE POLICY "Users can update own participant record"
  ON conversation_participants FOR UPDATE
  USING (user_id = auth.uid());

-- FunÃ§Ã£o para criar conversa geral automaticamente
CREATE OR REPLACE FUNCTION create_general_chat()
RETURNS void AS $$
DECLARE
  general_conv_id UUID;
BEGIN
  -- Criar conversa geral se nÃ£o existir
  INSERT INTO conversations (type, name)
  VALUES ('general', 'Chat Geral')
  ON CONFLICT DO NOTHING
  RETURNING id INTO general_conv_id;
  
  IF general_conv_id IS NULL THEN
    SELECT id INTO general_conv_id
    FROM conversations
    WHERE type = 'general'
    LIMIT 1;
  END IF;
  
  -- Adicionar todos os lÃ­deres e pastores
  INSERT INTO conversation_participants (conversation_id, user_id)
  SELECT general_conv_id, user_id
  FROM user_roles
  WHERE role IN ('leader', 'pastor')
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- FunÃ§Ã£o para criar conversa privada
CREATE OR REPLACE FUNCTION create_private_conversation(
  other_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  conv_id UUID;
  existing_conv UUID;
BEGIN
  -- Verificar se jÃ¡ existe conversa privada entre os dois usuÃ¡rios
  SELECT c.id INTO existing_conv
  FROM conversations c
  INNER JOIN conversation_participants cp1 ON cp1.conversation_id = c.id
  INNER JOIN conversation_participants cp2 ON cp2.conversation_id = c.id
  WHERE c.type = 'private'
    AND cp1.user_id = auth.uid()
    AND cp2.user_id = other_user_id
  LIMIT 1;
  
  IF existing_conv IS NOT NULL THEN
    RETURN existing_conv;
  END IF;
  
  -- Criar nova conversa privada
  INSERT INTO conversations (type)
  VALUES ('private')
  RETURNING id INTO conv_id;
  
  -- Adicionar ambos os participantes
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES 
    (conv_id, auth.uid()),
    (conv_id, other_user_id);
    
  RETURN conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para adicionar novos lÃ­deres ao chat geral
CREATE OR REPLACE FUNCTION add_leader_to_general_chat()
RETURNS TRIGGER AS $$
DECLARE
  general_conv_id UUID;
BEGIN
  IF NEW.role IN ('leader', 'pastor') THEN
    SELECT id INTO general_conv_id
    FROM conversations
    WHERE type = 'general'
    LIMIT 1;
    
    IF general_conv_id IS NOT NULL THEN
      INSERT INTO conversation_participants (conversation_id, user_id)
      VALUES (general_conv_id, NEW.user_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_leader_created
  AFTER INSERT ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION add_leader_to_general_chat();

-- Inicializar chat geral com usuÃ¡rios existentes
SELECT create_general_chat();



-- Add super_admin to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'super_admin';



-- Assign super_admin role to lgtecserv@gmail.com
INSERT INTO user_roles (user_id, role, department)
VALUES (
  'aff25e57-3441-4ba8-bff2-33c6cbe79ba7',
  'super_admin',
  NULL
)
ON CONFLICT DO NOTHING;

-- Update RLS policies to include super_admin checks

-- Profiles table: Super admin can view and manage all profiles
CREATE POLICY "Super admin can manage all profiles" 
ON profiles FOR ALL 
USING (has_role(auth.uid(), 'super_admin'));

-- User roles table: Super admin can manage all roles
CREATE POLICY "Super admin can manage all roles" 
ON user_roles FOR ALL 
USING (has_role(auth.uid(), 'super_admin') OR is_super_admin(auth.uid()));

-- Members table: Super admin can manage all members
CREATE POLICY "Super admin can manage all members" 
ON members FOR ALL 
USING (has_role(auth.uid(), 'super_admin'));

-- Visitors table: Super admin can manage all visitors
CREATE POLICY "Super admin can manage all visitors" 
ON visitors FOR ALL 
USING (has_role(auth.uid(), 'super_admin'));

-- Visitor followups table: Super admin can manage all followups
CREATE POLICY "Super admin can manage all followups" 
ON visitor_followups FOR ALL 
USING (has_role(auth.uid(), 'super_admin'));

-- Attendances table: Super admin can manage all attendances
CREATE POLICY "Super admin can manage all attendances" 
ON attendances FOR ALL 
USING (has_role(auth.uid(), 'super_admin'));

-- Notifications table: Super admin can manage all notifications
CREATE POLICY "Super admin can manage all notifications" 
ON notifications FOR ALL 
USING (has_role(auth.uid(), 'super_admin'));

-- Conversations table: Super admin can manage all conversations
CREATE POLICY "Super admin can manage all conversations" 
ON conversations FOR ALL 
USING (has_role(auth.uid(), 'super_admin'));

-- Conversation participants table: Super admin can manage all participants
CREATE POLICY "Super admin can manage all participants" 
ON conversation_participants FOR ALL 
USING (has_role(auth.uid(), 'super_admin'));

-- Messages table: Super admin can manage all messages
CREATE POLICY "Super admin can manage all messages" 
ON messages FOR ALL 
USING (has_role(auth.uid(), 'super_admin'));



-- Criar funÃ§Ã£o SECURITY DEFINER para evitar recursÃ£o infinita nas polÃ­ticas RLS
CREATE OR REPLACE FUNCTION public.is_conversation_participant(conv_id uuid, uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conv_id AND user_id = uid
  );
$$;

-- Remover polÃ­ticas problemÃ¡ticas que causam recursÃ£o
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;

-- Criar novas polÃ­ticas sem recursÃ£o para conversation_participants
CREATE POLICY "Users can view own participation"
ON conversation_participants FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can view co-participants"
ON conversation_participants FOR SELECT
USING (is_conversation_participant(conversation_id, auth.uid()));

-- Recriar polÃ­ticas de messages usando a funÃ§Ã£o SECURITY DEFINER
DROP POLICY IF EXISTS "Users can view messages" ON messages;
CREATE POLICY "Users can view messages"
ON messages FOR SELECT
USING (is_conversation_participant(conversation_id, auth.uid()));

DROP POLICY IF EXISTS "Users can send messages" ON messages;
CREATE POLICY "Users can send messages"
ON messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid() 
  AND is_conversation_participant(conversation_id, auth.uid())
);

-- Garantir que a funÃ§Ã£o create_private_conversation usa SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.create_private_conversation(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv_id UUID;
  existing_conv UUID;
BEGIN
  -- Verificar se jÃ¡ existe conversa privada entre os dois usuÃ¡rios
  SELECT c.id INTO existing_conv
  FROM conversations c
  INNER JOIN conversation_participants cp1 ON cp1.conversation_id = c.id
  INNER JOIN conversation_participants cp2 ON cp2.conversation_id = c.id
  WHERE c.type = 'private'
    AND cp1.user_id = auth.uid()
    AND cp2.user_id = other_user_id
  LIMIT 1;
  
  IF existing_conv IS NOT NULL THEN
    RETURN existing_conv;
  END IF;
  
  -- Criar nova conversa privada
  INSERT INTO conversations (type)
  VALUES ('private')
  RETURNING id INTO conv_id;
  
  -- Adicionar ambos os participantes
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES 
    (conv_id, auth.uid()),
    (conv_id, other_user_id);
    
  RETURN conv_id;
END;
$$;



-- Criar tabela para tracking de digitaÃ§Ã£o
CREATE TABLE typing_indicators (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  is_typing boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- RLS para ver quem estÃ¡ digitando na conversa
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view typing in own conversations"
ON typing_indicators FOR SELECT
USING (is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "Users can update own typing"
ON typing_indicators FOR ALL
USING (user_id = auth.uid());

CREATE POLICY "Super admin can manage all typing indicators"
ON typing_indicators FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE typing_indicators;

-- Adicionar coluna read_by na tabela messages
ALTER TABLE messages ADD COLUMN read_by uuid[] DEFAULT '{}';

-- FunÃ§Ã£o para marcar como lido
CREATE OR REPLACE FUNCTION mark_message_read(msg_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE messages 
  SET read_by = array_append(read_by, auth.uid())
  WHERE id = msg_id 
    AND NOT (auth.uid() = ANY(read_by))
    AND sender_id != auth.uid()
    AND is_conversation_participant(conversation_id, auth.uid());
END;
$$;



-- Adicionar coluna delivered_to para rastrear entrega de mensagens
ALTER TABLE messages ADD COLUMN delivered_to uuid[] DEFAULT '{}';

-- FunÃ§Ã£o para marcar mensagem como entregue
CREATE OR REPLACE FUNCTION mark_message_delivered(msg_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE messages 
  SET delivered_to = array_append(delivered_to, auth.uid())
  WHERE id = msg_id 
    AND NOT (auth.uid() = ANY(delivered_to))
    AND sender_id != auth.uid()
    AND is_conversation_participant(conversation_id, auth.uid());
END;
$$;



-- Create user notification settings table
CREATE TABLE IF NOT EXISTS public.user_notification_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  sound_enabled boolean NOT NULL DEFAULT true,
  sound_name text NOT NULL DEFAULT 'notify-default',
  message_sound_enabled boolean NOT NULL DEFAULT true,
  notification_sound_enabled boolean NOT NULL DEFAULT true,
  volume numeric NOT NULL DEFAULT 0.7 CHECK (volume >= 0 AND volume <= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_notification_settings ENABLE ROW LEVEL SECURITY;

-- Users can view and manage their own notification settings
CREATE POLICY "Users can view own notification settings"
ON public.user_notification_settings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification settings"
ON public.user_notification_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification settings"
ON public.user_notification_settings
FOR UPDATE
USING (auth.uid() = user_id);

-- Super admin can manage all notification settings
CREATE POLICY "Super admin can manage all notification settings"
ON public.user_notification_settings
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Add updated_at trigger
CREATE TRIGGER update_user_notification_settings_updated_at
  BEFORE UPDATE ON public.user_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();



-- FASE 2: Criar configuraÃ§Ãµes de notificaÃ§Ã£o para usuÃ¡rios que nÃ£o tÃªm
CREATE OR REPLACE FUNCTION create_missing_notification_settings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_notification_settings (user_id, sound_enabled, sound_name, message_sound_enabled, notification_sound_enabled, volume)
  SELECT ur.user_id, true, 'notify-default', true, true, 0.7
  FROM user_roles ur
  WHERE NOT EXISTS (
    SELECT 1 FROM user_notification_settings uns
    WHERE uns.user_id = ur.user_id
  );
END;
$$;

-- Executar funÃ§Ã£o para criar configuraÃ§Ãµes faltantes
SELECT create_missing_notification_settings();

-- FASE 3.1: Atualizar trigger para incluir super_admin no chat geral
DROP TRIGGER IF EXISTS on_user_role_created ON user_roles;

CREATE OR REPLACE FUNCTION public.add_leader_to_general_chat()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  general_conv_id UUID;
BEGIN
  -- Incluir leader, pastor e super_admin
  IF NEW.role IN ('leader', 'pastor', 'super_admin') THEN
    SELECT id INTO general_conv_id
    FROM conversations
    WHERE type = 'general'
    LIMIT 1;
    
    IF general_conv_id IS NOT NULL THEN
      INSERT INTO conversation_participants (conversation_id, user_id)
      VALUES (general_conv_id, NEW.user_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_user_role_created
  AFTER INSERT ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.add_leader_to_general_chat();

-- FASE 3.2: Adicionar super_admin ao chat geral existente
INSERT INTO conversation_participants (conversation_id, user_id)
SELECT c.id, 'aff25e57-3441-4ba8-bff2-33c6cbe79ba7'
FROM conversations c
WHERE c.type = 'general'
ON CONFLICT DO NOTHING;

-- FASE 3.3: Atualizar funÃ§Ã£o create_general_chat para incluir super_admin
CREATE OR REPLACE FUNCTION public.create_general_chat()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  general_conv_id UUID;
BEGIN
  -- Criar conversa geral se nÃ£o existir
  INSERT INTO conversations (type, name)
  VALUES ('general', 'Chat Geral')
  ON CONFLICT DO NOTHING
  RETURNING id INTO general_conv_id;
  
  IF general_conv_id IS NULL THEN
    SELECT id INTO general_conv_id
    FROM conversations
    WHERE type = 'general'
    LIMIT 1;
  END IF;
  
  -- Adicionar todos os lÃ­deres, pastores e super_admins
  INSERT INTO conversation_participants (conversation_id, user_id)
  SELECT general_conv_id, user_id
  FROM user_roles
  WHERE role IN ('leader', 'pastor', 'super_admin')
  ON CONFLICT DO NOTHING;
END;
$$;



-- CORREÃ‡ÃƒO 1: Permitir lÃ­deres ver profiles de outros lÃ­deres/pastores para chat
CREATE POLICY "Leaders can view leader and pastor profiles for chat"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = profiles.id 
    AND ur.role IN ('leader', 'pastor')
  )
  AND
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('leader', 'pastor', 'super_admin')
  )
);

-- CORREÃ‡ÃƒO 2: FunÃ§Ã£o para criar notificaÃ§Ã£o de nova mensagem
CREATE OR REPLACE FUNCTION notify_message_recipient()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_id UUID;
  sender_name TEXT;
  conv_type TEXT;
BEGIN
  -- Buscar tipo da conversa
  SELECT type INTO conv_type 
  FROM conversations 
  WHERE id = NEW.conversation_id;
  
  -- Buscar nome do remetente
  SELECT full_name INTO sender_name 
  FROM profiles 
  WHERE id = NEW.sender_id;
  
  -- Para cada participante que nÃ£o seja o remetente
  FOR recipient_id IN 
    SELECT user_id 
    FROM conversation_participants 
    WHERE conversation_id = NEW.conversation_id 
    AND user_id != NEW.sender_id
  LOOP
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      recipient_id,
      CASE 
        WHEN conv_type = 'general' THEN 'Nova mensagem no Chat Geral'
        ELSE 'Nova mensagem de ' || COALESCE(sender_name, 'UsuÃ¡rio')
      END,
      LEFT(NEW.content, 100),
      'info',
      '/chat'
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Trigger para executar apÃ³s inserÃ§Ã£o de mensagem
CREATE TRIGGER on_message_insert
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION notify_message_recipient();



-- FASE 1: Permitir lÃ­deres ver roles de outros lÃ­deres/pastores para chat
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



-- Atualizar trigger para chamar edge function de push notification
CREATE OR REPLACE FUNCTION notify_message_recipient()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_id UUID;
  sender_name TEXT;
  conv_type TEXT;
  new_notification_id UUID;
BEGIN
  -- Buscar tipo da conversa
  SELECT type INTO conv_type 
  FROM conversations 
  WHERE id = NEW.conversation_id;
  
  -- Buscar nome do remetente
  SELECT full_name INTO sender_name 
  FROM profiles 
  WHERE id = NEW.sender_id;
  
  -- Para cada participante que nÃ£o seja o remetente
  FOR recipient_id IN 
    SELECT user_id 
    FROM conversation_participants 
    WHERE conversation_id = NEW.conversation_id 
    AND user_id != NEW.sender_id
  LOOP
    -- Criar notificaÃ§Ã£o
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      recipient_id,
      CASE 
        WHEN conv_type = 'general' THEN 'Nova mensagem no Chat Geral'
        ELSE 'Nova mensagem de ' || COALESCE(sender_name, 'UsuÃ¡rio')
      END,
      LEFT(NEW.content, 100),
      'info',
      '/chat'
    )
    RETURNING id INTO new_notification_id;
    
    -- Chamar edge function para enviar push notification
    -- Nota: Esta chamada Ã© assÃ­ncrona e nÃ£o bloqueia a inserÃ§Ã£o
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'notification_id', new_notification_id,
        'user_id', recipient_id
      )
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;



-- 1. Remover polÃ­ticas problemÃ¡ticas
DROP POLICY IF EXISTS "Leaders can view leader and pastor roles for chat" ON public.user_roles;
DROP POLICY IF EXISTS "Leaders can view leader and pastor profiles for chat" ON public.profiles;

-- 2. Recriar polÃ­tica de user_roles usando has_role()
CREATE POLICY "Leaders can view leader and pastor roles for chat"
ON public.user_roles
FOR SELECT
USING (
  role IN ('leader', 'pastor')
  AND (
    has_role(auth.uid(), 'leader') 
    OR has_role(auth.uid(), 'pastor') 
    OR has_role(auth.uid(), 'super_admin')
  )
);

-- 3. Criar funÃ§Ã£o auxiliar SECURITY DEFINER para verificar se um profile Ã© lÃ­der/pastor
CREATE OR REPLACE FUNCTION public.is_leader_or_pastor(profile_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = profile_id
    AND role IN ('leader', 'pastor')
  );
$$;

-- 4. Recriar polÃ­tica de profiles usando funÃ§Ãµes SECURITY DEFINER
CREATE POLICY "Leaders can view leader and pastor profiles for chat"
ON public.profiles
FOR SELECT
USING (
  is_leader_or_pastor(id)
  AND (
    has_role(auth.uid(), 'leader') 
    OR has_role(auth.uid(), 'pastor') 
    OR has_role(auth.uid(), 'super_admin')
  )
);



-- 1. Criar funÃ§Ã£o SECURITY DEFINER para verificar lÃ­deres do mesmo departamento
CREATE OR REPLACE FUNCTION public.is_same_department_leader(profile_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_roles ur1
    JOIN user_roles ur2 ON ur1.department = ur2.department
    WHERE ur1.user_id = auth.uid() 
    AND ur1.role = 'leader'
    AND ur2.user_id = profile_id 
    AND ur2.role = 'leader'
  );
$$;

-- 2. Remover polÃ­tica problemÃ¡tica
DROP POLICY IF EXISTS "Leaders can view same department leader profiles" ON public.profiles;

-- 3. Recriar polÃ­tica usando funÃ§Ã£o SECURITY DEFINER
CREATE POLICY "Leaders can view same department leader profiles"
ON public.profiles
FOR SELECT
USING (
  is_same_department_leader(id)
);



-- Recriar funÃ§Ã£o notify_message_recipient sem a chamada net.http_post()
CREATE OR REPLACE FUNCTION public.notify_message_recipient()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_id UUID;
  sender_name TEXT;
  conv_type TEXT;
BEGIN
  -- Buscar tipo da conversa
  SELECT type INTO conv_type 
  FROM conversations 
  WHERE id = NEW.conversation_id;
  
  -- Buscar nome do remetente
  SELECT full_name INTO sender_name 
  FROM profiles 
  WHERE id = NEW.sender_id;
  
  -- Para cada participante que nÃ£o seja o remetente
  FOR recipient_id IN 
    SELECT user_id 
    FROM conversation_participants 
    WHERE conversation_id = NEW.conversation_id 
    AND user_id != NEW.sender_id
  LOOP
    -- Criar notificaÃ§Ã£o no banco de dados
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      recipient_id,
      CASE 
        WHEN conv_type = 'general' THEN 'Nova mensagem no Chat Geral'
        ELSE 'Nova mensagem de ' || COALESCE(sender_name, 'UsuÃ¡rio')
      END,
      LEFT(NEW.content, 100),
      'info',
      '/chat'
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;



-- Adicionar novos departamentos ao enum department_type
ALTER TYPE department_type ADD VALUE IF NOT EXISTS 'patrimonio';
ALTER TYPE department_type ADD VALUE IF NOT EXISTS 'tesouraria';



-- Criar tabela church_assets (Materiais da Igreja - PatrimÃ´nio)
CREATE TABLE public.church_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  condition TEXT NOT NULL CHECK (condition IN ('perfeito', 'danificado')),
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  leader_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela asset_requests (SolicitaÃ§Ãµes de Uso - PatrimÃ´nio)
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

-- Criar tabela tithes (DÃ­zimos - Tesouraria)
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

-- Criar Ã­ndices para melhor performance
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

-- LÃ­der do patrimÃ´nio pode gerenciar seus assets
CREATE POLICY "LÃ­der patrimÃ´nio pode gerenciar seus assets"
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

-- LÃ­der do patrimÃ´nio pode gerenciar suas solicitaÃ§Ãµes
CREATE POLICY "LÃ­der patrimÃ´nio pode gerenciar suas solicitaÃ§Ãµes"
ON public.asset_requests
FOR ALL
USING (
  has_role(auth.uid(), 'leader'::app_role) 
  AND get_user_department(auth.uid()) = 'patrimonio'::department_type
  AND requested_by = auth.uid()
);

-- Pastor pode ver todas as solicitaÃ§Ãµes
CREATE POLICY "Pastor pode ver todas solicitaÃ§Ãµes"
ON public.asset_requests
FOR SELECT
USING (has_role(auth.uid(), 'pastor'::app_role));

-- Tesouraria pode ver todas as solicitaÃ§Ãµes
CREATE POLICY "Tesouraria pode ver todas solicitaÃ§Ãµes"
ON public.asset_requests
FOR SELECT
USING (
  has_role(auth.uid(), 'leader'::app_role) 
  AND get_user_department(auth.uid()) = 'tesouraria'::department_type
);

-- Super admin pode gerenciar todas as solicitaÃ§Ãµes
CREATE POLICY "Super admin pode gerenciar todas solicitaÃ§Ãµes"
ON public.asset_requests
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- ===== OFFERINGS POLICIES =====

-- LÃ­der da tesouraria pode gerenciar ofertas
CREATE POLICY "LÃ­der tesouraria pode gerenciar ofertas"
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

-- LÃ­der da tesouraria pode gerenciar dÃ­zimos
CREATE POLICY "LÃ­der tesouraria pode gerenciar dÃ­zimos"
ON public.tithes
FOR ALL
USING (
  has_role(auth.uid(), 'leader'::app_role) 
  AND get_user_department(auth.uid()) = 'tesouraria'::department_type
);

-- Pastor pode ver todos os dÃ­zimos
CREATE POLICY "Pastor pode ver todos dÃ­zimos"
ON public.tithes
FOR SELECT
USING (has_role(auth.uid(), 'pastor'::app_role));

-- Super admin pode gerenciar todos os dÃ­zimos
CREATE POLICY "Super admin pode gerenciar todos dÃ­zimos"
ON public.tithes
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- ===== EXPENSES POLICIES =====

-- LÃ­der da tesouraria pode gerenciar gastos
CREATE POLICY "LÃ­der tesouraria pode gerenciar gastos"
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

-- ===== TRIGGER PARA NOTIFICAÃ‡Ã•ES DE SOLICITAÃ‡Ã•ES =====

-- FunÃ§Ã£o para notificar quando uma solicitaÃ§Ã£o Ã© criada
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
      'Nova SolicitaÃ§Ã£o de PatrimÃ´nio',
      COALESCE(requester_name, 'UsuÃ¡rio') || ' solicitou ' || NEW.quantity || ' unidade(s) de ' || COALESCE(asset_name, 'item'),
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
      'Nova SolicitaÃ§Ã£o de PatrimÃ´nio',
      COALESCE(requester_name, 'UsuÃ¡rio') || ' solicitou ' || NEW.quantity || ' unidade(s) de ' || COALESCE(asset_name, 'item'),
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
      'Nova SolicitaÃ§Ã£o de PatrimÃ´nio',
      COALESCE(requester_name, 'UsuÃ¡rio') || ' solicitou ' || NEW.quantity || ' unidade(s) de ' || COALESCE(asset_name, 'item'),
      'warning',
      '/chat'
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para notificaÃ§Ãµes
CREATE TRIGGER trigger_notify_asset_request
AFTER INSERT ON public.asset_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_asset_request();



-- Fase 1: CorreÃ§Ãµes de Banco de Dados

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
CREATE POLICY "Qualquer um pode visualizar assets pÃºblicos"
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

-- PolÃ­ticas para balance_adjustments
CREATE POLICY "LÃ­der tesouraria pode gerenciar ajustes"
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

-- Adicionar coluna de comentÃ¡rio em asset_requests
ALTER TABLE public.asset_requests 
ADD COLUMN IF NOT EXISTS approval_comment TEXT;

-- Adicionar trigger para updated_at em balance_adjustments
CREATE TRIGGER update_balance_adjustments_updated_at
BEFORE UPDATE ON public.balance_adjustments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();



-- Adicionar RLS policy para Tesouraria ver todos os materiais do patrimÃ´nio
CREATE POLICY "Tesouraria pode ver todos assets"
ON church_assets FOR SELECT
USING (
  has_role(auth.uid(), 'leader'::app_role) 
  AND get_user_department(auth.uid()) = 'tesouraria'::department_type
);

-- Adicionar RLS policy para Tesouraria aprovar/rejeitar solicitaÃ§Ãµes
CREATE POLICY "Tesouraria pode aprovar solicitaÃ§Ãµes"
ON asset_requests FOR UPDATE
USING (
  has_role(auth.uid(), 'leader'::app_role) 
  AND get_user_department(auth.uid()) = 'tesouraria'::department_type
);



-- Permitir que tesouraria veja todos os membros para registrar dÃ­zimos
CREATE POLICY "Tesouraria pode ver todos membros para dÃ­zimos"
ON members FOR SELECT
USING (
  has_role(auth.uid(), 'leader'::app_role) 
  AND get_user_department(auth.uid()) = 'tesouraria'::department_type
);



-- Adicionar coluna avatar_url na tabela profiles
ALTER TABLE profiles ADD COLUMN avatar_url TEXT;

-- Criar bucket para avatares
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true);

-- PolÃ­ticas RLS para o bucket avatars
CREATE POLICY "UsuÃ¡rios podem fazer upload de seu avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Avatares sÃ£o pÃºblicos para visualizaÃ§Ã£o"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "UsuÃ¡rios podem atualizar seu avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "UsuÃ¡rios podem deletar seu avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);



-- FunÃ§Ã£o para enviar push notification via edge function quando uma notificaÃ§Ã£o Ã© criada
CREATE OR REPLACE FUNCTION send_push_on_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Chamar edge function para enviar push notification de forma assÃ­ncrona
  -- Isso garante que push notifications sejam enviadas mesmo quando o app estÃ¡ fechado
  PERFORM net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key')
    ),
    body := jsonb_build_object(
      'notification_id', NEW.id,
      'user_id', NEW.user_id
    )
  );
  
  RETURN NEW;
END;
$$;

-- Criar trigger para enviar push notifications
DROP TRIGGER IF EXISTS on_notification_created ON notifications;
CREATE TRIGGER on_notification_created
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION send_push_on_notification();

-- ComentÃ¡rio explicativo
COMMENT ON FUNCTION send_push_on_notification() IS 'Envia push notification via edge function quando uma notificaÃ§Ã£o Ã© criada na tabela notifications';



-- Remover trigger anterior que usa net.http_post (nÃ£o funciona sem extensÃ£o)
DROP TRIGGER IF EXISTS on_notification_created ON notifications;
DROP FUNCTION IF EXISTS send_push_on_notification();

-- A edge function serÃ¡ chamada pelo frontend quando necessÃ¡rio
-- Por enquanto, as push notifications funcionarÃ£o via Service Worker
-- quando o navegador receber as notificaÃ§Ãµes do sistema



-- Enable the http extension for making HTTP calls from PostgreSQL
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Function to call the push notification edge function
CREATE OR REPLACE FUNCTION public.trigger_push_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  supabase_url TEXT;
  service_key TEXT;
  request_id BIGINT;
BEGIN
  -- Get the Supabase URL from environment
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_key := current_setting('app.settings.service_role_key', true);
  
  -- If settings are not available, use hardcoded URL (edge function is public)
  IF supabase_url IS NULL OR supabase_url = '' THEN
    supabase_url := 'https://ofplaocvnlwdnqvlqqka.supabase.co';
  END IF;

  -- Make HTTP POST request to the edge function
  -- Using pg_net extension for async HTTP calls
  PERFORM extensions.http((
    'POST',
    supabase_url || '/functions/v1/send-push-notification',
    ARRAY[
      extensions.http_header('Content-Type', 'application/json'),
      extensions.http_header('Authorization', 'Bearer ' || COALESCE(service_key, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mcGxhb2N2bmx3ZG5xdmxxcWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4Njk4MjYsImV4cCI6MjA3NjQ0NTgyNn0.6LYOL1QFdMuhpNkCzf5K2AtUk3nkgj3xHlG4jqi10k0'))
    ],
    'application/json',
    json_build_object('notification_id', NEW.id, 'user_id', NEW.user_id)::text
  )::extensions.http_request);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE WARNING 'Failed to trigger push notification: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger to call push notification function after insert
DROP TRIGGER IF EXISTS on_notification_insert_push ON public.notifications;

CREATE TRIGGER on_notification_insert_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_push_notification();



-- Add metadata column to notifications table for storing conversation_id
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL;

-- Update the notify_message_recipient function to include conversation_id in metadata
CREATE OR REPLACE FUNCTION public.notify_message_recipient()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_id UUID;
  sender_name TEXT;
  conv_type TEXT;
BEGIN
  -- Buscar tipo da conversa
  SELECT type INTO conv_type 
  FROM conversations 
  WHERE id = NEW.conversation_id;
  
  -- Buscar nome do remetente
  SELECT full_name INTO sender_name 
  FROM profiles 
  WHERE id = NEW.sender_id;
  
  -- Para cada participante que nÃ£o seja o remetente
  FOR recipient_id IN 
    SELECT user_id 
    FROM conversation_participants 
    WHERE conversation_id = NEW.conversation_id 
    AND user_id != NEW.sender_id
  LOOP
    -- Criar notificaÃ§Ã£o com metadata incluindo conversation_id
    INSERT INTO notifications (user_id, title, message, type, link, metadata)
    VALUES (
      recipient_id,
      CASE 
        WHEN conv_type = 'general' THEN 'Nova mensagem no Chat Geral'
        ELSE 'Nova mensagem de ' || COALESCE(sender_name, 'UsuÃ¡rio')
      END,
      LEFT(NEW.content, 100),
      'message',
      '/chat',
      jsonb_build_object('conversation_id', NEW.conversation_id)
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;



-- Remover constraint antiga
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Adicionar nova constraint com 'message' incluÃ­do
ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type = ANY (ARRAY['info', 'success', 'warning', 'error', 'message']));



-- Adicionar novos campos Ã  tabela members
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS member_type text DEFAULT 'membro';
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS photo_url text;

-- Criar bucket para fotos de membros
INSERT INTO storage.buckets (id, name, public) 
VALUES ('member-photos', 'member-photos', true)
ON CONFLICT (id) DO NOTHING;

-- PolÃ­ticas para o bucket member-photos
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



-- Enable http extension for calling edge functions
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Create or replace the trigger function to call push notification edge function
CREATE OR REPLACE FUNCTION public.trigger_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  supabase_url TEXT;
BEGIN
  supabase_url := 'https://ofplaocvnlwdnqvlqqka.supabase.co';

  -- Make HTTP POST request to the edge function
  PERFORM extensions.http((
    'POST',
    supabase_url || '/functions/v1/send-push-notification',
    ARRAY[
      extensions.http_header('Content-Type', 'application/json')
    ],
    'application/json',
    json_build_object('notification_id', NEW.id, 'user_id', NEW.user_id)::text
  )::extensions.http_request);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE WARNING 'Failed to trigger push notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_notification_insert_trigger ON public.notifications;

-- Create trigger on notifications table
CREATE TRIGGER on_notification_insert_trigger
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.trigger_push_notification();



-- Add unique constraint for user_id and endpoint combination
ALTER TABLE public.push_subscriptions 
ADD CONSTRAINT push_subscriptions_user_endpoint_unique 
UNIQUE (user_id, endpoint);



-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Drop ALL existing triggers that depend on the function
DROP TRIGGER IF EXISTS on_notification_insert_push ON public.notifications;
DROP TRIGGER IF EXISTS on_notification_insert_trigger ON public.notifications;

-- Drop the old function with CASCADE to remove any remaining dependencies
DROP FUNCTION IF EXISTS public.trigger_push_notification() CASCADE;

-- Create improved function using pg_net for async HTTP calls
CREATE OR REPLACE FUNCTION public.trigger_push_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  supabase_url TEXT := 'https://ofplaocvnlwdnqvlqqka.supabase.co';
BEGIN
  -- Use pg_net for async HTTP POST (more reliable than extensions.http)
  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/send-push-notification',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('notification_id', NEW.id, 'user_id', NEW.user_id)
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE WARNING 'Failed to trigger push notification via pg_net: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate single trigger with correct name
CREATE TRIGGER on_notification_insert_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_push_notification();



-- Habilitar replica identity full para garantir que os dados completos sejam enviados
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Adicionar a tabela notifications Ã  publicaÃ§Ã£o supabase_realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;



-- Atualizar a funÃ§Ã£o notify_message_recipient para usar o link correto
CREATE OR REPLACE FUNCTION public.notify_message_recipient()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  recipient_id UUID;
  sender_name TEXT;
  conv_type TEXT;
BEGIN
  -- Buscar tipo da conversa
  SELECT type INTO conv_type 
  FROM conversations 
  WHERE id = NEW.conversation_id;
  
  -- Buscar nome do remetente
  SELECT full_name INTO sender_name 
  FROM profiles 
  WHERE id = NEW.sender_id;
  
  -- Para cada participante que nÃ£o seja o remetente
  FOR recipient_id IN 
    SELECT user_id 
    FROM conversation_participants 
    WHERE conversation_id = NEW.conversation_id 
    AND user_id != NEW.sender_id
  LOOP
    -- Criar notificaÃ§Ã£o com metadata incluindo conversation_id
    INSERT INTO notifications (user_id, title, message, type, link, metadata)
    VALUES (
      recipient_id,
      CASE 
        WHEN conv_type = 'general' THEN 'Nova mensagem no Chat Geral'
        ELSE 'Nova mensagem de ' || COALESCE(sender_name, 'UsuÃ¡rio')
      END,
      LEFT(NEW.content, 100),
      'message',
      '/dashboard/chat',
      jsonb_build_object('conversation_id', NEW.conversation_id)
    );
  END LOOP;
  
  RETURN NEW;
END;
$function$;



-- Adicionar novas colunas para separaÃ§Ã£o de sons por tipo
ALTER TABLE public.user_notification_settings
ADD COLUMN IF NOT EXISTS message_sound_name TEXT DEFAULT 'msg-short-1',
ADD COLUMN IF NOT EXISTS in_conversation_sound_name TEXT DEFAULT 'in-conv-soft',
ADD COLUMN IF NOT EXISTS in_conversation_volume NUMERIC DEFAULT 0.3,
ADD COLUMN IF NOT EXISTS alert_sound_name TEXT DEFAULT 'alert-long-1';

-- Atualizar registros existentes com valores padrÃ£o
UPDATE public.user_notification_settings
SET 
  message_sound_name = COALESCE(message_sound_name, 'msg-short-1'),
  in_conversation_sound_name = COALESCE(in_conversation_sound_name, 'in-conv-soft'),
  in_conversation_volume = COALESCE(in_conversation_volume, 0.3),
  alert_sound_name = COALESCE(alert_sound_name, 'alert-long-1')
WHERE message_sound_name IS NULL OR in_conversation_sound_name IS NULL;



-- Adicionar coluna de preferÃªncia de tema na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'light' CHECK (theme_preference IN ('light', 'dark'));



-- Atualizar constraint para permitir 'auto' como opÃ§Ã£o de tema
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_theme_preference_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_theme_preference_check 
CHECK (theme_preference IN ('light', 'dark', 'auto'));




-- ============================================================
-- FASE 1: MULTI-CONGREGAÃ‡ÃƒO (corrigida)
-- ============================================================

CREATE TABLE public.congregations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  city text,
  phone text,
  pastor_responsavel_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.congregations TO authenticated;
GRANT ALL ON public.congregations TO service_role;
ALTER TABLE public.congregations ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_congregations_updated_at BEFORE UPDATE ON public.congregations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.congregation_pastors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  congregation_id uuid NOT NULL REFERENCES public.congregations(id) ON DELETE CASCADE,
  pastor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_titular boolean NOT NULL DEFAULT false,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (congregation_id, pastor_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.congregation_pastors TO authenticated;
GRANT ALL ON public.congregation_pastors TO service_role;
ALTER TABLE public.congregation_pastors ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_congregation_pastors_pastor ON public.congregation_pastors(pastor_id);
CREATE INDEX idx_congregation_pastors_cong ON public.congregation_pastors(congregation_id);

-- is_super_admin dinÃ¢mico
DROP FUNCTION IF EXISTS public.is_super_admin(text);
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin');
$$;

-- ORDEM CORRETA: profiles ANTES de user_roles
INSERT INTO public.profiles (id, full_name, email)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email,'@',1)), u.email
FROM auth.users u
WHERE u.email IN ('lgtecserv@gmail.com', 'pastorrobertobueno@gmail.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'super_admin'::app_role
FROM auth.users u
WHERE u.email IN ('lgtecserv@gmail.com', 'pastorrobertobueno@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;

-- CongregaÃ§Ã£o Sede
DO $$
DECLARE sede_id uuid;
BEGIN
  SELECT id INTO sede_id FROM public.congregations WHERE name = 'Sede' LIMIT 1;
  IF sede_id IS NULL THEN
    INSERT INTO public.congregations (name, city, active) VALUES ('Sede', 'Maputo', true);
  END IF;
END $$;

-- Adicionar congregation_id
ALTER TABLE public.members            ADD COLUMN congregation_id uuid REFERENCES public.congregations(id);
ALTER TABLE public.visitors           ADD COLUMN congregation_id uuid REFERENCES public.congregations(id);
ALTER TABLE public.visitor_followups  ADD COLUMN congregation_id uuid REFERENCES public.congregations(id);
ALTER TABLE public.attendances        ADD COLUMN congregation_id uuid REFERENCES public.congregations(id);
ALTER TABLE public.tithes             ADD COLUMN congregation_id uuid REFERENCES public.congregations(id);
ALTER TABLE public.offerings          ADD COLUMN congregation_id uuid REFERENCES public.congregations(id);
ALTER TABLE public.expenses           ADD COLUMN congregation_id uuid REFERENCES public.congregations(id);
ALTER TABLE public.balance_adjustments ADD COLUMN congregation_id uuid REFERENCES public.congregations(id);
ALTER TABLE public.church_assets      ADD COLUMN congregation_id uuid REFERENCES public.congregations(id);
ALTER TABLE public.asset_requests     ADD COLUMN congregation_id uuid REFERENCES public.congregations(id);
ALTER TABLE public.user_roles         ADD COLUMN congregation_id uuid REFERENCES public.congregations(id);
ALTER TABLE public.conversations      ADD COLUMN congregation_id uuid REFERENCES public.congregations(id);

-- Backfill Sede
DO $$
DECLARE sede_id uuid;
BEGIN
  SELECT id INTO sede_id FROM public.congregations WHERE name = 'Sede' LIMIT 1;
  UPDATE public.members             SET congregation_id = sede_id WHERE congregation_id IS NULL;
  UPDATE public.visitors            SET congregation_id = sede_id WHERE congregation_id IS NULL;
  UPDATE public.visitor_followups   SET congregation_id = sede_id WHERE congregation_id IS NULL;
  UPDATE public.attendances         SET congregation_id = sede_id WHERE congregation_id IS NULL;
  UPDATE public.tithes              SET congregation_id = sede_id WHERE congregation_id IS NULL;
  UPDATE public.offerings           SET congregation_id = sede_id WHERE congregation_id IS NULL;
  UPDATE public.expenses            SET congregation_id = sede_id WHERE congregation_id IS NULL;
  UPDATE public.balance_adjustments SET congregation_id = sede_id WHERE congregation_id IS NULL;
  UPDATE public.church_assets       SET congregation_id = sede_id WHERE congregation_id IS NULL;
  UPDATE public.asset_requests      SET congregation_id = sede_id WHERE congregation_id IS NULL;
  UPDATE public.user_roles SET congregation_id = sede_id
    WHERE congregation_id IS NULL AND role IN ('leader','pastor');
  UPDATE public.conversations SET congregation_id = sede_id
    WHERE congregation_id IS NULL AND type = 'general';

  INSERT INTO public.congregation_pastors (congregation_id, pastor_id, is_titular)
  SELECT sede_id, ur.user_id, true FROM public.user_roles ur WHERE ur.role = 'pastor'
  ON CONFLICT (congregation_id, pastor_id) DO NOTHING;

  UPDATE public.congregations
    SET pastor_responsavel_id = (SELECT user_id FROM public.user_roles WHERE role='pastor' LIMIT 1)
    WHERE id = sede_id AND pastor_responsavel_id IS NULL;
END $$;

-- NOT NULL onde aplicÃ¡vel
ALTER TABLE public.members             ALTER COLUMN congregation_id SET NOT NULL;
ALTER TABLE public.visitors            ALTER COLUMN congregation_id SET NOT NULL;
ALTER TABLE public.attendances         ALTER COLUMN congregation_id SET NOT NULL;
ALTER TABLE public.tithes              ALTER COLUMN congregation_id SET NOT NULL;
ALTER TABLE public.offerings           ALTER COLUMN congregation_id SET NOT NULL;
ALTER TABLE public.expenses            ALTER COLUMN congregation_id SET NOT NULL;
ALTER TABLE public.church_assets       ALTER COLUMN congregation_id SET NOT NULL;

-- Ãndices
CREATE INDEX idx_members_congregation     ON public.members(congregation_id);
CREATE INDEX idx_visitors_congregation    ON public.visitors(congregation_id);
CREATE INDEX idx_attendances_congregation ON public.attendances(congregation_id);
CREATE INDEX idx_tithes_congregation      ON public.tithes(congregation_id);
CREATE INDEX idx_offerings_congregation   ON public.offerings(congregation_id);
CREATE INDEX idx_expenses_congregation    ON public.expenses(congregation_id);
CREATE INDEX idx_church_assets_congregation ON public.church_assets(congregation_id);
CREATE INDEX idx_user_roles_congregation  ON public.user_roles(congregation_id);

-- Helpers de acesso
CREATE OR REPLACE FUNCTION public.get_user_congregations(_user_id uuid)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cp.congregation_id FROM public.congregation_pastors cp WHERE cp.pastor_id = _user_id
  UNION
  SELECT ur.congregation_id FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.role = 'leader' AND ur.congregation_id IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.user_has_access_to_congregation(_user_id uuid, _congregation_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user_id)
    OR EXISTS (SELECT 1 FROM public.get_user_congregations(_user_id) gc WHERE gc = _congregation_id);
$$;

CREATE OR REPLACE FUNCTION public.get_leader_congregation(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT congregation_id FROM public.user_roles WHERE user_id = _user_id AND role = 'leader' LIMIT 1;
$$;

-- RLS congregations
CREATE POLICY "cong_super_all" ON public.congregations FOR ALL
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "cong_self_select" ON public.congregations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.congregation_pastors cp WHERE cp.congregation_id = id AND cp.pastor_id = auth.uid())
    OR public.get_leader_congregation(auth.uid()) = id
  );

CREATE POLICY "cp_super_all" ON public.congregation_pastors FOR ALL
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "cp_self_select" ON public.congregation_pastors FOR SELECT
  USING (pastor_id = auth.uid());

-- MEMBERS
DROP POLICY IF EXISTS "Leaders can view own department members" ON public.members;
DROP POLICY IF EXISTS "Leaders can insert members in own department" ON public.members;
DROP POLICY IF EXISTS "Leaders can update own department members" ON public.members;
DROP POLICY IF EXISTS "Leaders can delete own department members" ON public.members;
DROP POLICY IF EXISTS "Pastor can manage all members" ON public.members;
DROP POLICY IF EXISTS "Super admin can manage all members" ON public.members;
DROP POLICY IF EXISTS "Pastores podem ver todos os membros" ON public.members;
DROP POLICY IF EXISTS "Pastor pode gerenciar todos os membros" ON public.members;
CREATE POLICY "members_super_all" ON public.members FOR ALL
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "members_pastor_all" ON public.members FOR ALL
  USING (has_role(auth.uid(),'pastor'::app_role) AND public.user_has_access_to_congregation(auth.uid(), congregation_id))
  WITH CHECK (has_role(auth.uid(),'pastor'::app_role) AND public.user_has_access_to_congregation(auth.uid(), congregation_id));
CREATE POLICY "members_leader_select" ON public.members FOR SELECT
  USING (has_role(auth.uid(),'leader'::app_role) AND department = get_user_department(auth.uid()) AND congregation_id = get_leader_congregation(auth.uid()));
CREATE POLICY "members_leader_insert" ON public.members FOR INSERT
  WITH CHECK (has_role(auth.uid(),'leader'::app_role) AND department = get_user_department(auth.uid()) AND congregation_id = get_leader_congregation(auth.uid()) AND leader_id = auth.uid());
CREATE POLICY "members_leader_update" ON public.members FOR UPDATE
  USING (has_role(auth.uid(),'leader'::app_role) AND leader_id = auth.uid() AND congregation_id = get_leader_congregation(auth.uid()));
CREATE POLICY "members_leader_delete" ON public.members FOR DELETE
  USING (has_role(auth.uid(),'leader'::app_role) AND leader_id = auth.uid() AND congregation_id = get_leader_congregation(auth.uid()));

-- VISITORS
DROP POLICY IF EXISTS "Leaders can view own department visitors" ON public.visitors;
DROP POLICY IF EXISTS "Leaders can insert visitors in own department" ON public.visitors;
DROP POLICY IF EXISTS "Leaders can update own department visitors" ON public.visitors;
DROP POLICY IF EXISTS "Leaders can delete own department visitors" ON public.visitors;
DROP POLICY IF EXISTS "Pastor can manage all visitors" ON public.visitors;
DROP POLICY IF EXISTS "Super admin can manage all visitors" ON public.visitors;
CREATE POLICY "visitors_super_all" ON public.visitors FOR ALL
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "visitors_pastor_all" ON public.visitors FOR ALL
  USING (has_role(auth.uid(),'pastor'::app_role) AND public.user_has_access_to_congregation(auth.uid(), congregation_id))
  WITH CHECK (has_role(auth.uid(),'pastor'::app_role) AND public.user_has_access_to_congregation(auth.uid(), congregation_id));
CREATE POLICY "visitors_leader_select" ON public.visitors FOR SELECT
  USING (has_role(auth.uid(),'leader'::app_role) AND department = get_user_department(auth.uid()) AND congregation_id = get_leader_congregation(auth.uid()));
CREATE POLICY "visitors_leader_iud" ON public.visitors FOR ALL
  USING (has_role(auth.uid(),'leader'::app_role) AND leader_id = auth.uid() AND congregation_id = get_leader_congregation(auth.uid()))
  WITH CHECK (has_role(auth.uid(),'leader'::app_role) AND department = get_user_department(auth.uid()) AND leader_id = auth.uid() AND congregation_id = get_leader_congregation(auth.uid()));

-- VISITOR_FOLLOWUPS
DROP POLICY IF EXISTS "Leaders can view own department followups" ON public.visitor_followups;
DROP POLICY IF EXISTS "Leaders can insert followups in own department" ON public.visitor_followups;
DROP POLICY IF EXISTS "Leaders can update own department followups" ON public.visitor_followups;
DROP POLICY IF EXISTS "Leaders can delete own department followups" ON public.visitor_followups;
DROP POLICY IF EXISTS "Pastor can manage all followups" ON public.visitor_followups;
DROP POLICY IF EXISTS "Super admin can manage all followups" ON public.visitor_followups;
CREATE POLICY "followups_super_all" ON public.visitor_followups FOR ALL
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "followups_pastor_all" ON public.visitor_followups FOR ALL
  USING (has_role(auth.uid(),'pastor'::app_role) AND (congregation_id IS NULL OR public.user_has_access_to_congregation(auth.uid(), congregation_id)))
  WITH CHECK (has_role(auth.uid(),'pastor'::app_role) AND public.user_has_access_to_congregation(auth.uid(), congregation_id));
CREATE POLICY "followups_leader_all" ON public.visitor_followups FOR ALL
  USING (has_role(auth.uid(),'leader'::app_role) AND (congregation_id IS NULL OR congregation_id = get_leader_congregation(auth.uid())))
  WITH CHECK (has_role(auth.uid(),'leader'::app_role) AND congregation_id = get_leader_congregation(auth.uid()));

-- ATTENDANCES
DROP POLICY IF EXISTS "Leaders can view own department attendances" ON public.attendances;
DROP POLICY IF EXISTS "Leaders can insert attendances in own department" ON public.attendances;
DROP POLICY IF EXISTS "Leaders can update own department attendances" ON public.attendances;
DROP POLICY IF EXISTS "Leaders can delete own department attendances" ON public.attendances;
DROP POLICY IF EXISTS "Pastor can manage all attendances" ON public.attendances;
DROP POLICY IF EXISTS "Super admin can manage all attendances" ON public.attendances;
CREATE POLICY "att_super_all" ON public.attendances FOR ALL
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "att_pastor_all" ON public.attendances FOR ALL
  USING (has_role(auth.uid(),'pastor'::app_role) AND public.user_has_access_to_congregation(auth.uid(), congregation_id))
  WITH CHECK (has_role(auth.uid(),'pastor'::app_role) AND public.user_has_access_to_congregation(auth.uid(), congregation_id));
CREATE POLICY "att_leader_select" ON public.attendances FOR SELECT
  USING (has_role(auth.uid(),'leader'::app_role) AND department = get_user_department(auth.uid()) AND congregation_id = get_leader_congregation(auth.uid()));
CREATE POLICY "att_leader_iud" ON public.attendances FOR ALL
  USING (has_role(auth.uid(),'leader'::app_role) AND leader_id = auth.uid() AND congregation_id = get_leader_congregation(auth.uid()))
  WITH CHECK (has_role(auth.uid(),'leader'::app_role) AND department = get_user_department(auth.uid()) AND leader_id = auth.uid() AND congregation_id = get_leader_congregation(auth.uid()));

-- TITHES
DROP POLICY IF EXISTS "LÃ­der tesouraria pode gerenciar dÃ­zimos" ON public.tithes;
DROP POLICY IF EXISTS "Pastor pode ver todos dÃ­zimos" ON public.tithes;
DROP POLICY IF EXISTS "Super admin pode gerenciar todos dÃ­zimos" ON public.tithes;
CREATE POLICY "tithes_super_all" ON public.tithes FOR ALL
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "tithes_pastor_all" ON public.tithes FOR ALL
  USING (has_role(auth.uid(),'pastor'::app_role) AND public.user_has_access_to_congregation(auth.uid(), congregation_id))
  WITH CHECK (has_role(auth.uid(),'pastor'::app_role) AND public.user_has_access_to_congregation(auth.uid(), congregation_id));
CREATE POLICY "tithes_tesouraria_all" ON public.tithes FOR ALL
  USING (has_role(auth.uid(),'leader'::app_role) AND get_user_department(auth.uid())='tesouraria'::department_type AND congregation_id = get_leader_congregation(auth.uid()))
  WITH CHECK (has_role(auth.uid(),'leader'::app_role) AND get_user_department(auth.uid())='tesouraria'::department_type AND congregation_id = get_leader_congregation(auth.uid()));

-- OFFERINGS
DROP POLICY IF EXISTS "LÃ­der tesouraria pode gerenciar ofertas" ON public.offerings;
DROP POLICY IF EXISTS "Pastor pode ver todas ofertas" ON public.offerings;
DROP POLICY IF EXISTS "Super admin pode gerenciar todas ofertas" ON public.offerings;
CREATE POLICY "off_super_all" ON public.offerings FOR ALL
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "off_pastor_all" ON public.offerings FOR ALL
  USING (has_role(auth.uid(),'pastor'::app_role) AND public.user_has_access_to_congregation(auth.uid(), congregation_id))
  WITH CHECK (has_role(auth.uid(),'pastor'::app_role) AND public.user_has_access_to_congregation(auth.uid(), congregation_id));
CREATE POLICY "off_tesouraria_all" ON public.offerings FOR ALL
  USING (has_role(auth.uid(),'leader'::app_role) AND get_user_department(auth.uid())='tesouraria'::department_type AND congregation_id = get_leader_congregation(auth.uid()))
  WITH CHECK (has_role(auth.uid(),'leader'::app_role) AND get_user_department(auth.uid())='tesouraria'::department_type AND congregation_id = get_leader_congregation(auth.uid()));

-- EXPENSES
DROP POLICY IF EXISTS "LÃ­der tesouraria pode gerenciar despesas" ON public.expenses;
DROP POLICY IF EXISTS "Pastor pode ver todas despesas" ON public.expenses;
DROP POLICY IF EXISTS "Super admin pode gerenciar todas despesas" ON public.expenses;
CREATE POLICY "exp_super_all" ON public.expenses FOR ALL
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "exp_pastor_all" ON public.expenses FOR ALL
  USING (has_role(auth.uid(),'pastor'::app_role) AND public.user_has_access_to_congregation(auth.uid(), congregation_id))
  WITH CHECK (has_role(auth.uid(),'pastor'::app_role) AND public.user_has_access_to_congregation(auth.uid(), congregation_id));
CREATE POLICY "exp_tesouraria_all" ON public.expenses FOR ALL
  USING (has_role(auth.uid(),'leader'::app_role) AND get_user_department(auth.uid())='tesouraria'::department_type AND congregation_id = get_leader_congregation(auth.uid()))
  WITH CHECK (has_role(auth.uid(),'leader'::app_role) AND get_user_department(auth.uid())='tesouraria'::department_type AND congregation_id = get_leader_congregation(auth.uid()));

-- BALANCE_ADJUSTMENTS
DROP POLICY IF EXISTS "LÃ­der tesouraria pode gerenciar ajustes" ON public.balance_adjustments;
DROP POLICY IF EXISTS "Pastor pode ver todos ajustes" ON public.balance_adjustments;
DROP POLICY IF EXISTS "Super admin pode gerenciar todos ajustes" ON public.balance_adjustments;
CREATE POLICY "bal_super_all" ON public.balance_adjustments FOR ALL
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "bal_pastor_all" ON public.balance_adjustments FOR ALL
  USING (has_role(auth.uid(),'pastor'::app_role) AND (congregation_id IS NULL OR public.user_has_access_to_congregation(auth.uid(), congregation_id)))
  WITH CHECK (has_role(auth.uid(),'pastor'::app_role) AND public.user_has_access_to_congregation(auth.uid(), congregation_id));
CREATE POLICY "bal_tesouraria_all" ON public.balance_adjustments FOR ALL
  USING (has_role(auth.uid(),'leader'::app_role) AND get_user_department(auth.uid())='tesouraria'::department_type AND (congregation_id IS NULL OR congregation_id = get_leader_congregation(auth.uid())))
  WITH CHECK (has_role(auth.uid(),'leader'::app_role) AND get_user_department(auth.uid())='tesouraria'::department_type AND congregation_id = get_leader_congregation(auth.uid()));

-- CHURCH_ASSETS
DROP POLICY IF EXISTS "LÃ­der patrimÃ´nio pode gerenciar seus assets" ON public.church_assets;
DROP POLICY IF EXISTS "Pastor pode gerenciar todos assets" ON public.church_assets;
DROP POLICY IF EXISTS "Super admin pode gerenciar todos assets" ON public.church_assets;
DROP POLICY IF EXISTS "Tesouraria pode ver todos assets" ON public.church_assets;
CREATE POLICY "asset_super_all" ON public.church_assets FOR ALL
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "asset_pastor_all" ON public.church_assets FOR ALL
  USING (has_role(auth.uid(),'pastor'::app_role) AND public.user_has_access_to_congregation(auth.uid(), congregation_id))
  WITH CHECK (has_role(auth.uid(),'pastor'::app_role) AND public.user_has_access_to_congregation(auth.uid(), congregation_id));
CREATE POLICY "asset_patrimonio_all" ON public.church_assets FOR ALL
  USING (has_role(auth.uid(),'leader'::app_role) AND get_user_department(auth.uid())='patrimonio'::department_type AND congregation_id = get_leader_congregation(auth.uid()))
  WITH CHECK (has_role(auth.uid(),'leader'::app_role) AND get_user_department(auth.uid())='patrimonio'::department_type AND congregation_id = get_leader_congregation(auth.uid()) AND leader_id = auth.uid());
CREATE POLICY "asset_tesouraria_select" ON public.church_assets FOR SELECT
  USING (has_role(auth.uid(),'leader'::app_role) AND get_user_department(auth.uid())='tesouraria'::department_type AND congregation_id = get_leader_congregation(auth.uid()));

-- ASSET_REQUESTS
DROP POLICY IF EXISTS "LÃ­der patrimÃ´nio pode gerenciar suas solicitaÃ§Ãµes" ON public.asset_requests;
DROP POLICY IF EXISTS "Pastor pode ver todas solicitaÃ§Ãµes" ON public.asset_requests;
DROP POLICY IF EXISTS "Super admin pode gerenciar todas solicitaÃ§Ãµes" ON public.asset_requests;
DROP POLICY IF EXISTS "Tesouraria pode aprovar solicitaÃ§Ãµes" ON public.asset_requests;
DROP POLICY IF EXISTS "Tesouraria pode ver todas solicitaÃ§Ãµes" ON public.asset_requests;
CREATE POLICY "ar_super_all" ON public.asset_requests FOR ALL
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "ar_pastor_select" ON public.asset_requests FOR SELECT
  USING (has_role(auth.uid(),'pastor'::app_role) AND (congregation_id IS NULL OR public.user_has_access_to_congregation(auth.uid(), congregation_id)));
CREATE POLICY "ar_patrimonio_all" ON public.asset_requests FOR ALL
  USING (has_role(auth.uid(),'leader'::app_role) AND get_user_department(auth.uid())='patrimonio'::department_type AND requested_by = auth.uid())
  WITH CHECK (has_role(auth.uid(),'leader'::app_role) AND get_user_department(auth.uid())='patrimonio'::department_type AND requested_by = auth.uid());
CREATE POLICY "ar_tesouraria_select" ON public.asset_requests FOR SELECT
  USING (has_role(auth.uid(),'leader'::app_role) AND get_user_department(auth.uid())='tesouraria'::department_type);
CREATE POLICY "ar_tesouraria_update" ON public.asset_requests FOR UPDATE
  USING (has_role(auth.uid(),'leader'::app_role) AND get_user_department(auth.uid())='tesouraria'::department_type);

-- add_leader_to_general_chat (general por congregaÃ§Ã£o)
CREATE OR REPLACE FUNCTION public.add_leader_to_general_chat()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  general_conv_id UUID;
  target_cong UUID;
BEGIN
  IF NEW.role IN ('leader','pastor') AND NEW.congregation_id IS NOT NULL THEN
    target_cong := NEW.congregation_id;
    SELECT id INTO general_conv_id FROM conversations
      WHERE type = 'general' AND congregation_id = target_cong LIMIT 1;
    IF general_conv_id IS NULL THEN
      INSERT INTO conversations (type, name, congregation_id)
      VALUES ('general', 'Chat Geral', target_cong)
      RETURNING id INTO general_conv_id;
    END IF;
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES (general_conv_id, NEW.user_id) ON CONFLICT DO NOTHING;
  END IF;
  IF NEW.role = 'super_admin' THEN
    FOR general_conv_id IN SELECT id FROM conversations WHERE type='general' LOOP
      INSERT INTO conversation_participants (conversation_id, user_id)
      VALUES (general_conv_id, NEW.user_id) ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

-- Garantir chat geral da Sede
DO $$
DECLARE sede_id uuid; gen_id uuid;
BEGIN
  SELECT id INTO sede_id FROM public.congregations WHERE name='Sede' LIMIT 1;
  SELECT id INTO gen_id FROM public.conversations WHERE type='general' AND congregation_id = sede_id LIMIT 1;
  IF gen_id IS NULL THEN
    INSERT INTO public.conversations (type, name, congregation_id)
    VALUES ('general', 'Chat Geral', sede_id) RETURNING id INTO gen_id;
  END IF;
  INSERT INTO public.conversation_participants (conversation_id, user_id)
    SELECT gen_id, ur.user_id FROM public.user_roles ur
    WHERE ur.role IN ('leader','pastor') AND ur.congregation_id = sede_id
    ON CONFLICT DO NOTHING;
  INSERT INTO public.conversation_participants (conversation_id, user_id)
    SELECT gen_id, ur.user_id FROM public.user_roles ur WHERE ur.role='super_admin'
    ON CONFLICT DO NOTHING;
END $$;




-- 1. Adicionar 'secretary' ao enum app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'secretary';

-- 2. Helper SECURITY DEFINER usando cast text (independente do commit do enum)
CREATE OR REPLACE FUNCTION public.is_secretary(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = 'secretary'
  )
$$;

-- 3. Novos campos em members
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS church_function text,
  ADD COLUMN IF NOT EXISTS church_office  text;

-- =========================================================
-- 4. RLS â€” rebaixar super_admin para SELECT e dar ALL ao secretary
-- =========================================================

-- members
DROP POLICY IF EXISTS members_super_all ON public.members;
DROP POLICY IF EXISTS "Pastor can delete all members" ON public.members;
DROP POLICY IF EXISTS "Only pastor can delete members" ON public.members;
DROP POLICY IF EXISTS members_leader_delete ON public.members;
CREATE POLICY members_super_select ON public.members FOR SELECT
  USING (public.is_super_admin(auth.uid()));
CREATE POLICY members_secretary_all ON public.members FOR ALL
  USING (public.is_secretary(auth.uid()))
  WITH CHECK (public.is_secretary(auth.uid()));

-- expenses
DROP POLICY IF EXISTS exp_super_all ON public.expenses;
DROP POLICY IF EXISTS "Super admin pode gerenciar todos gastos" ON public.expenses;
CREATE POLICY exp_super_select ON public.expenses FOR SELECT
  USING (public.is_super_admin(auth.uid()));
CREATE POLICY exp_secretary_all ON public.expenses FOR ALL
  USING (public.is_secretary(auth.uid()))
  WITH CHECK (public.is_secretary(auth.uid()));

-- offerings
DROP POLICY IF EXISTS off_super_all ON public.offerings;
CREATE POLICY off_super_select ON public.offerings FOR SELECT
  USING (public.is_super_admin(auth.uid()));
CREATE POLICY off_secretary_all ON public.offerings FOR ALL
  USING (public.is_secretary(auth.uid()))
  WITH CHECK (public.is_secretary(auth.uid()));

-- tithes
DROP POLICY IF EXISTS tithes_super_all ON public.tithes;
CREATE POLICY tithes_super_select ON public.tithes FOR SELECT
  USING (public.is_super_admin(auth.uid()));
CREATE POLICY tithes_secretary_all ON public.tithes FOR ALL
  USING (public.is_secretary(auth.uid()))
  WITH CHECK (public.is_secretary(auth.uid()));

-- balance_adjustments
DROP POLICY IF EXISTS bal_super_all ON public.balance_adjustments;
CREATE POLICY bal_super_select ON public.balance_adjustments FOR SELECT
  USING (public.is_super_admin(auth.uid()));
CREATE POLICY bal_secretary_all ON public.balance_adjustments FOR ALL
  USING (public.is_secretary(auth.uid()))
  WITH CHECK (public.is_secretary(auth.uid()));

-- church_assets
DROP POLICY IF EXISTS asset_super_all ON public.church_assets;
CREATE POLICY asset_super_select ON public.church_assets FOR SELECT
  USING (public.is_super_admin(auth.uid()));
CREATE POLICY asset_secretary_all ON public.church_assets FOR ALL
  USING (public.is_secretary(auth.uid()))
  WITH CHECK (public.is_secretary(auth.uid()));

-- asset_requests
DROP POLICY IF EXISTS ar_super_all ON public.asset_requests;
CREATE POLICY ar_super_select ON public.asset_requests FOR SELECT
  USING (public.is_super_admin(auth.uid()));
CREATE POLICY ar_secretary_all ON public.asset_requests FOR ALL
  USING (public.is_secretary(auth.uid()))
  WITH CHECK (public.is_secretary(auth.uid()));

-- attendances
DROP POLICY IF EXISTS att_super_all ON public.attendances;
CREATE POLICY att_super_select ON public.attendances FOR SELECT
  USING (public.is_super_admin(auth.uid()));
CREATE POLICY att_secretary_all ON public.attendances FOR ALL
  USING (public.is_secretary(auth.uid()))
  WITH CHECK (public.is_secretary(auth.uid()));

-- visitors
DROP POLICY IF EXISTS visitors_super_all ON public.visitors;
CREATE POLICY visitors_super_select ON public.visitors FOR SELECT
  USING (public.is_super_admin(auth.uid()));
CREATE POLICY visitors_secretary_all ON public.visitors FOR ALL
  USING (public.is_secretary(auth.uid()))
  WITH CHECK (public.is_secretary(auth.uid()));

-- visitor_followups
DROP POLICY IF EXISTS followups_super_all ON public.visitor_followups;
CREATE POLICY followups_super_select ON public.visitor_followups FOR SELECT
  USING (public.is_super_admin(auth.uid()));
CREATE POLICY followups_secretary_all ON public.visitor_followups FOR ALL
  USING (public.is_secretary(auth.uid()))
  WITH CHECK (public.is_secretary(auth.uid()));

-- user_roles / congregations: secretÃ¡rio tambÃ©m gerencia
CREATE POLICY user_roles_secretary_all ON public.user_roles FOR ALL
  USING (public.is_secretary(auth.uid()))
  WITH CHECK (public.is_secretary(auth.uid()));
CREATE POLICY cong_secretary_all ON public.congregations FOR ALL
  USING (public.is_secretary(auth.uid()))
  WITH CHECK (public.is_secretary(auth.uid()));
CREATE POLICY cp_secretary_all ON public.congregation_pastors FOR ALL
  USING (public.is_secretary(auth.uid()))
  WITH CHECK (public.is_secretary(auth.uid()));



