CREATE TABLE public.plan_qa_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users,
  ts TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  verdict TEXT NOT NULL,
  summary TEXT NOT NULL,
  n INTEGER NOT NULL,
  runs_count INTEGER NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_qa_sessions TO authenticated;
GRANT ALL ON public.plan_qa_sessions TO service_role;

ALTER TABLE public.plan_qa_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own qa sessions"
  ON public.plan_qa_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX plan_qa_sessions_user_ts_idx ON public.plan_qa_sessions (user_id, ts DESC);