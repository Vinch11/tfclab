CREATE TABLE public.nolio_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nolio_tokens TO authenticated;
GRANT ALL ON public.nolio_tokens TO service_role;

ALTER TABLE public.nolio_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own nolio tokens"
ON public.nolio_tokens FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_nolio_tokens_updated_at
BEFORE UPDATE ON public.nolio_tokens
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();