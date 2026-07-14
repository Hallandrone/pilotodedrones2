-- Endurecer INSERT de diploma_qr_tokens: solo admins pueden insertar tokens.
-- Motivo: la policy anterior ("Allow insert for authenticated users", WITH CHECK true)
-- permitía a cualquier usuario autenticado insertar un token arbitrario y falsear
-- un diploma en su perfil público. El único insertor legítimo es el generador de
-- diplomas (DiplomaGenerator.tsx), que es una herramienta de admin.
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON diploma_qr_tokens;

CREATE POLICY "Only admins can insert QR tokens"
  ON diploma_qr_tokens
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()));
