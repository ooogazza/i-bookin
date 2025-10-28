-- Create storage bucket for house type drawings
INSERT INTO storage.buckets (id, name, public)
VALUES ('house-type-drawings', 'house-type-drawings', true);

-- Create table to store drawing metadata
CREATE TABLE public.house_type_drawings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  house_type_id UUID NOT NULL REFERENCES public.house_types(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  uploaded_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.house_type_drawings ENABLE ROW LEVEL SECURITY;

-- Admins can manage drawings
CREATE POLICY "Admins can manage house type drawings"
ON public.house_type_drawings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- All authenticated users can view drawings
CREATE POLICY "Users can view house type drawings"
ON public.house_type_drawings
FOR SELECT
USING (true);

-- Storage policies for house-type-drawings bucket
CREATE POLICY "Authenticated users can view drawings"
ON storage.objects
FOR SELECT
USING (bucket_id = 'house-type-drawings' AND auth.role() = 'authenticated');

CREATE POLICY "Admins can upload drawings"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'house-type-drawings' AND 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update drawings"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'house-type-drawings' AND 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete drawings"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'house-type-drawings' AND 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Add index for performance
CREATE INDEX idx_house_type_drawings_house_type_id 
ON public.house_type_drawings(house_type_id);

CREATE INDEX idx_house_type_drawings_display_order 
ON public.house_type_drawings(house_type_id, display_order);