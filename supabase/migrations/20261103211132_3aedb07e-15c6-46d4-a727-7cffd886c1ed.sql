ALTER TABLE public.club_invitations
  ADD COLUMN IF NOT EXISTS opened_date timestamptz,
  ADD COLUMN IF NOT EXISTS sent_date timestamptz,
  ADD COLUMN IF NOT EXISTS received_date timestamptz,
  ADD COLUMN IF NOT EXISTS resend_email_id text,
  ADD COLUMN IF NOT EXISTS last_reminded_date timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_count integer NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS club_invitations_token_idx ON public.club_invitations(token);