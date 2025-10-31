-- Create storage bucket for invoice images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoice-images',
  'invoice-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- Create RLS policies for invoice-images bucket
CREATE POLICY "Users can upload invoice images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'invoice-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own invoice images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'invoice-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all invoice images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'invoice-images' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Users can delete their own invoice images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'invoice-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add image_url column to bookings table
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add image_url column to non_plot_invoices table
ALTER TABLE public.non_plot_invoices
ADD COLUMN IF NOT EXISTS image_url TEXT;