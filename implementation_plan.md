# Diploma QR Association and Verification Enhancements

Enhance the QR code flow for diplomas to handle initial association (asking if the user has an account) and providing a verification view once associated.

## Proposed Changes

### [Frontend] QR Redirection Logic
#### [MODIFY] [QRRedirect.tsx](file:///c:/Users/Alvaro/Documents/GitHub/pilotodedrones2hallan/src/pages/QRRedirect.tsx)
- Update the layout to ask the user if they already have an account when the QR is not yet associated.
- Provide two clear paths: "Ya tengo cuenta" and "Soy nuevo / Crear cuenta".
- If the QR is already associated, redirect to `/verificar-diploma?codigo={token}` instead of the public profile directly.

### [Frontend] Diploma Verification Page
#### [MODIFY] [DiplomaVerification.tsx](file:///c:/Users/Alvaro/Documents/GitHub/pilotodedrones2hallan/src/pages/DiplomaVerification.tsx)
- Update the query to also fetch `user_id` (and potentially the associated profile) from `diploma_qr_tokens`.
- If the diploma is associated with a user, display a prominent button "Ver Perfil del Piloto" linking to their public profile.
- Ensure the student name displayed matches the one from the diploma or the profile (as per existing data).

### [Frontend] Authentication Flow
#### [MODIFY] [Auth.tsx](file:///c:/Users/Alvaro/Documents/GitHub/pilotodedrones2hallan/src/pages/Auth.tsx)
- Verify and ensure the `pendingQrToken` logic correctly associates the token upon both successful login and new registration.
- Verify that after association, it redirects to the correct confirmation or profile page.

## Verification Plan

### Manual Verification
1. Scan a QR code that is NOT associated.
   - Verify that the modal/page asks "Ya tengo cuenta" vs "No tengo cuenta".
   - Test "Ya tengo cuenta": Should go to Login, and after login, the diploma should be associated.
   - Test "No tengo cuenta": Should go to Register, and after registration, the diploma should be associated.
2. Scan a QR code that IS associated.
   - Verify it redirects to `/verificar-diploma?codigo=...`.
   - Verify the verification page shows the "Ver Perfil" button.
   - Verify clicking "Ver Perfil" goes to the correct public profile.
