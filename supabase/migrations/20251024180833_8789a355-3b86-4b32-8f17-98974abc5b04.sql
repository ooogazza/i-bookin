-- Add foreign key from user_site_assignments to profiles
ALTER TABLE public.user_site_assignments
DROP CONSTRAINT IF EXISTS user_site_assignments_user_id_fkey;

ALTER TABLE public.user_site_assignments
ADD CONSTRAINT user_site_assignments_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;