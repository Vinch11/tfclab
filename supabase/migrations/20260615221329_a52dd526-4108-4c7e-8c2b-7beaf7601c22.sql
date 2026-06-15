
CREATE OR REPLACE FUNCTION public.nolio_rename_repeat_count_to_value(node jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  result jsonb;
  elem jsonb;
  k text;
  v jsonb;
BEGIN
  IF node IS NULL THEN
    RETURN NULL;
  END IF;

  IF jsonb_typeof(node) = 'array' THEN
    result := '[]'::jsonb;
    FOR elem IN SELECT * FROM jsonb_array_elements(node) LOOP
      result := result || jsonb_build_array(public.nolio_rename_repeat_count_to_value(elem));
    END LOOP;
    RETURN result;
  END IF;

  IF jsonb_typeof(node) = 'object' THEN
    result := '{}'::jsonb;
    FOR k, v IN SELECT * FROM jsonb_each(node) LOOP
      IF k = 'repeat_count'
         AND node->>'type' = 'repetition'
         AND NOT (node ? 'value') THEN
        result := result || jsonb_build_object('value', v);
      ELSE
        result := result || jsonb_build_object(k, public.nolio_rename_repeat_count_to_value(v));
      END IF;
    END LOOP;
    RETURN result;
  END IF;

  RETURN node;
END;
$$;
