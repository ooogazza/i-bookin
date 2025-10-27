-- Allow all authenticated users to view active letterhead
CREATE POLICY "All users can view active letterhead"
ON public.letterhead_settings
FOR SELECT
USING (is_active = true);

-- Also allow all users to view letterhead files in storage
CREATE POLICY "All users can view active letterheads in storage"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'letterheads' AND 
  EXISTS (
    SELECT 1 FROM public.letterhead_settings 
    WHERE file_url LIKE '%' || name || '%' AND is_active = true
  )
);