-- Historial privado para los mismos roles/permisos que pueden crear diplomas.
-- Aditiva: no cambia las políticas públicas de verificación ni de reclamo.
ALTER TABLE public.diplomas
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date;

CREATE OR REPLACE FUNCTION public.search_issued_diplomas(
  p_search text DEFAULT '',
  p_page integer DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result jsonb;
  search_text text := lower(trim(coalesce(p_search, '')));
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.user_roles r
    WHERE r.id = auth.uid()
      AND (r.role = 'super_admin' OR (r.role = 'admin' AND EXISTS (
        SELECT 1 FROM public.user_permissions p
        WHERE p.user_id = r.id AND p.permission = 'create_diplomas'
      )))
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para consultar diplomas'
      USING ERRCODE = '42501';
  END IF;
  IF p_page IS NULL OR p_page < 0 OR p_page > 100000 OR length(search_text) > 200 THEN
    RAISE EXCEPTION 'Parámetros de búsqueda no válidos' USING ERRCODE = '22023';
  END IF;

  WITH matching AS (
    SELECT d.* FROM public.diplomas d
    WHERE search_text = ''
      OR strpos(lower(coalesce(d.student_name, '')), search_text) > 0
      OR strpos(lower(coalesce(d.course_title, '')), search_text) > 0
      OR strpos(lower(coalesce(d.city, '')), search_text) > 0
      OR coalesce(d.correlative_number::text, '') = ltrim(search_text, '#0')
      OR lower(coalesce(d.certificate_number, '')) = search_text
  ), page_rows AS (
    SELECT m.*,
      (SELECT t.token FROM public.diploma_qr_tokens t
       WHERE t.diploma_id = m.id ORDER BY t.created_at, t.id LIMIT 1) AS qr_token
    FROM matching m
    ORDER BY m.created_at DESC, m.id DESC
    LIMIT 20 OFFSET (p_page * 20)
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM matching),
    'items', coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.created_at DESC, p.id DESC)
                      FROM page_rows p), '[]'::jsonb)
  ) INTO result;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.search_issued_diplomas(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_issued_diplomas(text, integer) TO authenticated;
