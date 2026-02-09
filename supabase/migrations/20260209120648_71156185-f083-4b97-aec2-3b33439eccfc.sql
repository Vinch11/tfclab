
-- Custom templates imported via CSV
CREATE TABLE public.custom_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID NOT NULL,
  name TEXT NOT NULL,
  target TEXT NOT NULL DEFAULT '703', -- IM, 703, Marathon, Semi
  description TEXT,
  weeks_json JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of TemplateWeek objects
  weeks_count INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'csv',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "custom_templates_select_own"
  ON public.custom_templates FOR SELECT
  USING (coach_id = auth.uid());

CREATE POLICY "custom_templates_insert_own"
  ON public.custom_templates FOR INSERT
  WITH CHECK (coach_id = auth.uid());

CREATE POLICY "custom_templates_update_own"
  ON public.custom_templates FOR UPDATE
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

CREATE POLICY "custom_templates_delete_own"
  ON public.custom_templates FOR DELETE
  USING (coach_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_custom_templates_updated_at
  BEFORE UPDATE ON public.custom_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
