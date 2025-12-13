-- Add unique constraint for user_id and endpoint combination
ALTER TABLE public.push_subscriptions 
ADD CONSTRAINT push_subscriptions_user_endpoint_unique 
UNIQUE (user_id, endpoint);