-- =====================================================================
-- Eliminar diplomas mal emitidos y reutilizar su folio
-- ---------------------------------------------------------------------
-- QUIÉN: los mismos usuarios que pueden crear diplomas (super_admin, o
-- admin con el permiso create_diplomas), igual que search_issued_diplomas.
--
-- FOLIO: hasta ahora el folio se calculaba en el navegador como
-- count(diplomas) + 14600, lo que produce duplicados al borrar o al emitir
-- en paralelo. Desde esta migración el folio lo asigna la base de datos:
--   * next_diploma_folio(): el menor folio liberado por una eliminación que
--     siga sin usarse; si no hay ninguno, el máximo vigente + 1.
--     Ejemplo: emitidos 11, 12 y 13; se elimina el 11 → el próximo diploma
--     toma el 11 y el siguiente continúa en el 14.
--   * issue_diploma(): inserta diploma + código QR bajo un bloqueo
--     consultivo, de modo que dos emisiones simultáneas nunca repitan folio.
--   * delete_issued_diploma(): guarda una copia del diploma en
--     diploma_deletions (auditoría), borra el diploma y su código QR y deja
--     el folio disponible.
--
-- SEGURIDAD: la política "Admins can manage diplomas" tenía USING (true),
-- es decir, cualquier visitante con la clave pública podía leer, insertar,
-- modificar y BORRAR diplomas. Pasa a exigir is_admin(); los perfiles
-- públicos siguen viendo los diplomas cuyo QR ya fue reclamado.
-- =====================================================================

-- 1) Auditoría de eliminaciones y cola de folios liberados -------------
CREATE TABLE IF NOT EXISTS public.diploma_deletions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diploma_id uuid NOT NULL,
  correlative_number integer,
  diploma jsonb NOT NULL,
  qr_token text,
  qr_claimed_by uuid,
  deleted_by uuid NOT NULL,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  reused_by_diploma_id uuid,
  reused_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_diploma_deletions_pending_folio
  ON public.diploma_deletions (correlative_number)
  WHERE reused_at IS NULL AND correlative_number IS NOT NULL;

ALTER TABLE public.diploma_deletions ENABLE ROW LEVEL SECURITY;
-- Sin políticas: solo se accede a través de las funciones SECURITY DEFINER.

-- 2) Permiso compartido -------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_manage_diplomas(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT _user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_roles r
    WHERE r.id = _user_id
      AND (r.role = 'super_admin' OR (r.role = 'admin' AND EXISTS (
        SELECT 1 FROM public.user_permissions p
        WHERE p.user_id = r.id AND p.permission = 'create_diplomas'
      )))
  );
$$;
REVOKE ALL ON FUNCTION public.can_manage_diplomas(uuid) FROM PUBLIC, anon, authenticated;

-- 3) Próximo folio ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.next_diploma_folio()
RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.can_manage_diplomas(auth.uid()) THEN
    RAISE EXCEPTION 'No tienes permiso para emitir diplomas' USING ERRCODE = '42501';
  END IF;
  RETURN coalesce(
    (SELECT min(x.correlative_number) FROM public.diploma_deletions x
      WHERE x.reused_at IS NULL AND x.correlative_number IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM public.diplomas d
                        WHERE d.correlative_number = x.correlative_number)),
    (SELECT greatest(coalesce(max(d.correlative_number), 14599) + 1, 14600)
       FROM public.diplomas d)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.next_diploma_folio() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_diploma_folio() TO authenticated;

-- 4) Emisión con folio asignado por la base de datos -------------------
-- Contrato (jsonb):
--   { success: true, diploma: {...fila de diplomas...} }
--   { success: false, error: 'folio_no_disponible', next_folio: N }
--     -> el folio mostrado en pantalla ya fue tomado; volver a generar el PDF.
CREATE OR REPLACE FUNCTION public.issue_diploma(p_diploma jsonb, p_folio integer, p_token text)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_token text := upper(regexp_replace(coalesce(p_token, ''), '[\s-]', '', 'g'));
  v_expected integer;
  v_row public.diplomas;
BEGIN
  IF NOT public.can_manage_diplomas(v_uid) THEN
    RAISE EXCEPTION 'No tienes permiso para emitir diplomas' USING ERRCODE = '42501';
  END IF;
  IF p_diploma IS NULL OR jsonb_typeof(p_diploma) <> 'object'
     OR nullif(trim(p_diploma->>'student_name'), '') IS NULL
     OR nullif(trim(p_diploma->>'course_date'), '') IS NULL
     OR nullif(trim(p_diploma->>'course_title'), '') IS NULL THEN
    RAISE EXCEPTION 'Faltan datos obligatorios del diploma' USING ERRCODE = '22023';
  END IF;
  IF v_token !~ '^[A-Z0-9]{8}$' THEN
    RAISE EXCEPTION 'Código QR no válido' USING ERRCODE = '22023';
  END IF;

  -- Serializa emisiones y eliminaciones: un solo folio a la vez.
  PERFORM pg_advisory_xact_lock(hashtext('public.diplomas.folio'));

  v_expected := public.next_diploma_folio();
  IF p_folio IS DISTINCT FROM v_expected THEN
    RETURN jsonb_build_object('success', false, 'error', 'folio_no_disponible',
                              'next_folio', v_expected);
  END IF;

  INSERT INTO public.diplomas (
    student_name, course_date, course_hours, course_title, instructor_name, city,
    certificate_number, correlative_number, drone_series, start_date, end_date
  ) VALUES (
    trim(p_diploma->>'student_name'),
    (p_diploma->>'course_date')::date,
    nullif(trim(p_diploma->>'course_hours'), ''),
    trim(p_diploma->>'course_title'),
    nullif(trim(p_diploma->>'instructor_name'), ''),
    nullif(trim(p_diploma->>'city'), ''),
    nullif(trim(p_diploma->>'certificate_number'), ''),
    v_expected,
    nullif(trim(p_diploma->>'drone_series'), ''),
    nullif(trim(p_diploma->>'start_date'), '')::date,
    nullif(trim(p_diploma->>'end_date'), '')::date
  ) RETURNING * INTO v_row;

  INSERT INTO public.diploma_qr_tokens (token, diploma_id) VALUES (v_token, v_row.id);

  UPDATE public.diploma_deletions
     SET reused_by_diploma_id = v_row.id, reused_at = now()
   WHERE reused_at IS NULL AND correlative_number = v_expected;

  RETURN jsonb_build_object('success', true, 'diploma', to_jsonb(v_row));
END;
$$;
REVOKE ALL ON FUNCTION public.issue_diploma(jsonb, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.issue_diploma(jsonb, integer, text) TO authenticated;

-- 5) Eliminación con liberación del folio ------------------------------
-- Contrato (jsonb):
--   { success: true, released_folio: N|null, qr_was_claimed: bool, next_folio: M }
--   { success: false, error: 'not_found' }
CREATE OR REPLACE FUNCTION public.delete_issued_diploma(p_diploma_id uuid)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.diplomas;
  v_token text;
  v_claimed_by uuid;
  v_released integer;
BEGIN
  IF NOT public.can_manage_diplomas(v_uid) THEN
    RAISE EXCEPTION 'No tienes permiso para eliminar diplomas' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('public.diplomas.folio'));

  SELECT * INTO v_row FROM public.diplomas WHERE id = p_diploma_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  SELECT t.token, t.user_id INTO v_token, v_claimed_by
    FROM public.diploma_qr_tokens t
   WHERE t.diploma_id = v_row.id
   ORDER BY t.created_at, t.id LIMIT 1;

  INSERT INTO public.diploma_deletions
    (diploma_id, correlative_number, diploma, qr_token, qr_claimed_by, deleted_by)
  VALUES
    (v_row.id, v_row.correlative_number, to_jsonb(v_row), v_token, v_claimed_by, v_uid);

  DELETE FROM public.diploma_qr_tokens WHERE diploma_id = v_row.id;
  DELETE FROM public.diplomas WHERE id = v_row.id;

  -- El folio solo queda libre si ningún otro diploma lo sigue usando
  -- (hay duplicados históricos anteriores a esta migración).
  IF v_row.correlative_number IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.diplomas d WHERE d.correlative_number = v_row.correlative_number
  ) THEN
    v_released := v_row.correlative_number;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'released_folio', v_released,
    'qr_was_claimed', v_claimed_by IS NOT NULL,
    'next_folio', public.next_diploma_folio()
  );
END;
$$;
REVOKE ALL ON FUNCTION public.delete_issued_diploma(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_issued_diploma(uuid) TO authenticated;

-- 6) La consulta de emitidos informa si el QR ya fue reclamado ---------
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
  IF NOT public.can_manage_diplomas(auth.uid()) THEN
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
       WHERE t.diploma_id = m.id ORDER BY t.created_at, t.id LIMIT 1) AS qr_token,
      EXISTS (SELECT 1 FROM public.diploma_qr_tokens t
       WHERE t.diploma_id = m.id AND t.user_id IS NOT NULL) AS qr_claimed
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

-- 7) Cerrar la política abierta de diplomas ----------------------------
DROP POLICY IF EXISTS "Admins can manage diplomas" ON public.diplomas;
CREATE POLICY "Admins can manage diplomas"
  ON public.diplomas FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Diplomas of claimed QR codes are publicly readable" ON public.diplomas;
CREATE POLICY "Diplomas of claimed QR codes are publicly readable"
  ON public.diplomas FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.diploma_qr_tokens t
    WHERE t.diploma_id = diplomas.id AND t.user_id IS NOT NULL
  ));
