-- Atualizar constraint para permitir 'auto' como opção de tema
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_theme_preference_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_theme_preference_check 
CHECK (theme_preference IN ('light', 'dark', 'auto'));