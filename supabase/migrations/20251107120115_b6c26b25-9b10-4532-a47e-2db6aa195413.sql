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