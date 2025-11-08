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