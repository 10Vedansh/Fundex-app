
-- Create storage bucket for data files
INSERT INTO storage.buckets (id, name, public)
VALUES ('data-files', 'data-files', false)
ON CONFLICT (id) DO NOTHING;

-- Allow service role to read from data-files bucket
CREATE POLICY "Service role can read data files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'data-files');

-- Allow authenticated users to upload to data-files bucket  
CREATE POLICY "Authenticated users can upload data files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'data-files' AND auth.role() = 'authenticated');
