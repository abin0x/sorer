ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS arrive_minutes_before integer DEFAULT 45,
  ADD COLUMN IF NOT EXISTS is_away boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS opponent_name text,
  ADD COLUMN IF NOT EXISTS kit text,
  ADD COLUMN IF NOT EXISTS team_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS opponent_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS period text NOT NULL DEFAULT 'pregame',
  ADD COLUMN IF NOT EXISTS clock_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS clock_elapsed_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_posted_at timestamptz;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='calendar_events') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;
  END IF;
END $$;