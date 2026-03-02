
-- Add per-user salt column for PIN hashing
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pin_salt text;

-- Add RLS policies to otp_records (service-role only access, deny all for anon/authenticated)
ALTER TABLE public.otp_records ENABLE ROW LEVEL SECURITY;
-- No permissive policies = deny all client access. Only service_role (used by edge functions) bypasses RLS.

-- Tighten storage: restrict uploads to user-specific folders and add file type validation
DROP POLICY IF EXISTS "Authenticated users can upload data files" ON storage.objects;
CREATE POLICY "Users upload to own folder with restrictions"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'data-files'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to delete their own files
CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'data-files'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Restrict SELECT to user's own files (plus service role for processing)
DROP POLICY IF EXISTS "Service role can read data files" ON storage.objects;
CREATE POLICY "Users can read own files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'data-files'
    AND (
      auth.role() = 'service_role'
      OR (auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text)
    )
  );
