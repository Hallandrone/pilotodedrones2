-- =====================================================================
-- RPC: unlink_diploma_code — desvincular un diploma de la cuenta que lo reclamó
-- ---------------------------------------------------------------------
-- El alumno (desde «Mis Diplomas Asociados») o quien puede gestionar
-- diplomas (super_admin, o admin con create_diplomas) quita la asociación
-- entre el código QR y el usuario. El diploma sigue siendo válido y su QR
-- queda libre para que lo reclame el titular correcto.
--
-- PLAN: el reclamo activa el plan Pro con payment_method 'academy_diploma'.
-- Si tras desvincular el usuario ya no tiene ningún diploma asociado y su
-- Pro provino de un diploma, vuelve a Free. Los planes otorgados por un
-- administrador ('admin_grant') o pagados no se tocan.
--
-- Retorno (jsonb):
--   { success: true, plan_downgraded: bool }
--   { success: false, error: 'not_found' | 'not_claimed' | 'forbidden' }
-- =====================================================================

-- 1) Auditoría ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.diploma_unlinks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id uuid NOT NULL,
  token text NOT NULL,
  diploma_id uuid,
  previous_user_id uuid NOT NULL,
  unlinked_by uuid NOT NULL,
  plan_downgraded boolean NOT NULL DEFAULT false,
  unlinked_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.diploma_unlinks ENABLE ROW LEVEL SECURITY;
-- Sin políticas: solo se escribe desde la función SECURITY DEFINER.

-- 2) Función -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.unlink_diploma_code(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_token public.diploma_qr_tokens%ROWTYPE;
  v_owner uuid;
  v_downgraded boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  SELECT * INTO v_token
  FROM public.diploma_qr_tokens
  WHERE upper(token) = upper(regexp_replace(coalesce(p_token, ''), '[\s-]', '', 'g'))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  IF v_token.user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_claimed');
  END IF;

  IF v_token.user_id <> v_uid AND NOT public.can_manage_diplomas(v_uid) THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  v_owner := v_token.user_id;

  UPDATE public.diploma_qr_tokens
  SET user_id = NULL,
      associated_at = NULL,
      updated_at = now()
  WHERE id = v_token.id;

  -- Sin más diplomas asociados y con Pro de academia -> vuelve a Free.
  IF NOT EXISTS (SELECT 1 FROM public.diploma_qr_tokens t WHERE t.user_id = v_owner) THEN
    UPDATE public.user_subscriptions
    SET plan_name = 'free',
        status = 'active',
        payment_method = NULL,
        renewal_date = NULL,
        updated_at = now()
    WHERE user_id = v_owner
      AND plan_name = 'pro'
      AND payment_method = 'academy_diploma';
    v_downgraded := FOUND;
  END IF;

  INSERT INTO public.diploma_unlinks (token_id, token, diploma_id, previous_user_id, unlinked_by, plan_downgraded)
  VALUES (v_token.id, v_token.token, v_token.diploma_id, v_owner, v_uid, v_downgraded);

  RETURN jsonb_build_object('success', true, 'plan_downgraded', v_downgraded);
END;
$$;

-- 3) Permisos ----------------------------------------------------------------
REVOKE ALL ON FUNCTION public.unlink_diploma_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unlink_diploma_code(text) TO authenticated;
