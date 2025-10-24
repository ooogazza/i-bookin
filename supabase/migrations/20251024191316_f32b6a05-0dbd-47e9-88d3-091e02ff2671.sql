-- Create invitations table to track pending invites
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  UNIQUE(email, site_id)
);

-- Enable RLS on invitations
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Only admins can manage invitations
CREATE POLICY "Admins can manage invitations"
ON public.invitations
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update the handle_new_user function to assign standard role by default
-- and automatically add users to sites they were invited to
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  -- Assign standard role by default (not admin)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'standard');
  
  -- Check for pending invitations and auto-assign to sites
  INSERT INTO public.user_site_assignments (user_id, site_id)
  SELECT NEW.id, site_id
  FROM public.invitations
  WHERE email = NEW.email 
    AND status = 'pending'
    AND expires_at > now();
  
  -- Mark invitations as accepted
  UPDATE public.invitations
  SET status = 'accepted'
  WHERE email = NEW.email 
    AND status = 'pending'
    AND expires_at > now();
  
  RETURN NEW;
END;
$$;

-- Update sites RLS policy so standard users can only see sites they're assigned to
DROP POLICY IF EXISTS "Users can view all sites" ON public.sites;

CREATE POLICY "Users can view assigned sites"
ON public.sites
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR
  EXISTS (
    SELECT 1 FROM public.user_site_assignments
    WHERE user_id = auth.uid() AND site_id = sites.id
  )
);

-- Update plots RLS policy to allow standard users to see plots on their assigned sites
DROP POLICY IF EXISTS "Users can view assigned plots" ON public.plots;

CREATE POLICY "Users can view plots on assigned sites"
ON public.plots
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR
  (assigned_to = auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.user_site_assignments
    WHERE user_id = auth.uid() AND site_id = plots.site_id
  )
);