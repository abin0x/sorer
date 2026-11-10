CREATE TABLE public.device_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  platform text NOT NULL,
  app_version text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT device_push_tokens_platform CHECK (platform IN ('ios','android','web')),
  CONSTRAINT device_push_tokens_token_len CHECK (char_length(token) BETWEEN 16 AND 4096)
);
CREATE INDEX device_push_tokens_user_idx ON public.device_push_tokens(user_id);
GRANT SELECT, DELETE ON public.device_push_tokens TO authenticated;
GRANT ALL ON public.device_push_tokens TO service_role;
ALTER TABLE public.device_push_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own device tokens" ON public.device_push_tokens FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users remove own device tokens" ON public.device_push_tokens FOR DELETE TO authenticated USING (auth.uid() = user_id);