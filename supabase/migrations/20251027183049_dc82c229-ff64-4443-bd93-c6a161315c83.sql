-- Create storage bucket for letterheads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('letterheads', 'letterheads', false);

-- Create letterhead_settings table
CREATE TABLE public.letterhead_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id) NOT NULL,
  uploaded_at timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.letterhead_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can view letterhead settings
CREATE POLICY "Admins can view letterhead settings"
ON public.letterhead_settings
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert letterhead settings
CREATE POLICY "Admins can insert letterhead settings"
ON public.letterhead_settings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update letterhead settings
CREATE POLICY "Admins can update letterhead settings"
ON public.letterhead_settings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete letterhead settings
CREATE POLICY "Admins can delete letterhead settings"
ON public.letterhead_settings
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Storage policies for letterheads bucket
CREATE POLICY "Admins can view letterheads"
ON storage.objects
FOR SELECT
USING (bucket_id = 'letterheads' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can upload letterheads"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'letterheads' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update letterheads"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'letterheads' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete letterheads"
ON storage.objects
FOR DELETE
USING (bucket_id = 'letterheads' AND has_role(auth.uid(), 'admin'::app_role));