-- =====================================================================
-- Seguridad diploma_qr_tokens — PARTE 1 de 2: RPC de verificación (ADITIVA)
-- ---------------------------------------------------------------------
-- Esta migración SOLO crea la RPC get_diploma_by_token. Es ADITIVA: no
-- cambia políticas ni rompe nada del frontend actual. Se puede aplicar
-- ANTES del deploy del frontend nuevo (de hecho, DEBE aplicarse antes,
-- porque el front nuevo la usa para verificar diplomas).
--
-- La PARTE 2 (20260713000001_restrict_diploma_tokens.sql) cierra la
-- enumeración de tokens y SÍ es incompatible con el front viejo, por lo
-- que se aplica DESPUÉS de que el front nuevo esté en producción
-- (secuencia de ventana cero).
--
-- CONTEXTO: con el modelo Pro-solo-alumnos, cada token sin reclamar de
-- diploma_qr_tokens es una llave que otorga Pro (vía claim_diploma_code).
-- La verificación pública de diplomas pasa a hacerse por esta RPC
-- SECURITY DEFINER que EXIGE el token exacto (no permite listar/enumerar).
--
-- Contrato de retorno (jsonb):
--   { "found": false }                                  -> token no existe
--   { "found": true, "token": "...", "user_id": null|uuid,
--     "diploma": { ...columnas de diplomas... } }        -> encontrado
-- =====================================================================

CREATE OR REPLACE FUNCTION public.get_diploma_by_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_token diploma_qr_tokens%ROWTYPE;
  v_diploma jsonb;
BEGIN
  -- Normalizar igual que claim_diploma_code: sin espacios ni guiones, mayúsculas.
  v_code := upper(regexp_replace(coalesce(p_token, ''), '[\s-]', '', 'g'));

  IF v_code = '' THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  -- Búsqueda por token exacto (case-insensitive). Nunca lista la tabla.
  SELECT * INTO v_token
  FROM diploma_qr_tokens
  WHERE upper(token) = v_code
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  -- Datos del diploma asociado (puede no existir el registro en diplomas).
  SELECT to_jsonb(d) INTO v_diploma
  FROM diplomas d
  WHERE d.id = v_token.diploma_id;

  RETURN jsonb_build_object(
    'found', true,
    'token', v_token.token,
    'user_id', v_token.user_id,
    'diploma', v_diploma  -- null si no hay fila en diplomas
  );
END;
$$;

-- La verificación de diplomas es pública: anon y authenticated pueden ejecutarla.
REVOKE EXECUTE ON FUNCTION public.get_diploma_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_diploma_by_token(text) TO anon, authenticated;
