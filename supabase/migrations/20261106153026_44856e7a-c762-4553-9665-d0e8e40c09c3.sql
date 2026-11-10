ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS delivery text,
  ADD COLUMN IF NOT EXISTS is_priority boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS channel_id text,
  ADD COLUMN IF NOT EXISTS channel_name text;

CREATE POLICY "Club members upload Beacon files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'beacon_files' AND private.is_club_member((storage.foldername(name))[1]));
CREATE POLICY "Club members read Beacon files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'beacon_files' AND private.is_club_member((storage.foldername(name))[1]));
CREATE POLICY "Uploaders delete own Beacon files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'beacon_files' AND owner = auth.uid());
CREATE POLICY "Signed-in users upload public assets" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'public_base44_assets' AND (storage.foldername(name))[1] = 'uploads');