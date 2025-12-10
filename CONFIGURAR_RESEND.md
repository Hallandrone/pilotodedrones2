# Configurar RESEND_API_KEY en Supabase

## ⚠️ PROBLEMA IDENTIFICADO

**La variable `RESEND_API_KEY` NO está configurada en Supabase Edge Functions.**

Esto explica por qué los emails no se están enviando.

## Solución

### Paso 1: Obtener tu API Key de Resend

1. Ve a: https://resend.com/api-keys
2. Crea una nueva API Key o copia una existente
3. La API Key debe tener el formato: `re_xxxxxxxxxxxxxxxxxxxxxxxxx`

### Paso 2: Configurar la API Key en Supabase

Ejecuta este comando (reemplaza `TU_API_KEY_AQUI` con tu API Key real):

```bash
npx supabase secrets set RESEND_API_KEY=TU_API_KEY_AQUI --project-ref sncjozwmtjaltoituumx
```

### Paso 3: Configurar FRONTEND_URL (si no está configurada)

```bash
npx supabase secrets set FRONTEND_URL=https://pilotodedrones.cl --project-ref sncjozwmtjaltoituumx
```

### Paso 4: Verificar que se configuraron correctamente

```bash
npx supabase secrets list --project-ref sncjozwmtjaltoituumx
```

Deberías ver algo como:

```
NAME                | DIGEST
RESEND_API_KEY      | abc123...
FRONTEND_URL        | def456...
SUPABASE_URL        | 4288f9a4110f88633b59f59d
```

### Paso 5: Probar el envío de invitación

1. Ve a tu aplicación
2. Inicia sesión como empresa
3. Intenta enviar una invitación
4. Revisa los logs en: https://supabase.com/dashboard/project/sncjozwmtjaltoituumx/logs/edge-functions

## Notas Importantes

- **No compartas tu API Key** públicamente
- La API Key debe tener permisos para enviar emails
- El dominio `pilotodedrones.cl` debe estar verificado en Resend
- Los registros DNS (SPF, DKIM, DMARC) deben estar configurados correctamente

## Verificar Configuración de Resend

1. **Dominio verificado**: https://resend.com/domains
2. **API Keys**: https://resend.com/api-keys
3. **Logs de envío**: https://resend.com/emails

## Si el problema persiste

Después de configurar la API Key, revisa los logs de la Edge Function para ver mensajes detallados:

```bash
npx supabase functions logs send-invitation-email --project-ref sncjozwmtjaltoituumx
```

Los logs ahora incluyen emojis para facilitar la lectura:
- 🚀 Inicio de función
- 📥 Recepción de datos
- 🔍 Validación
- 🔑 Verificación de API Key
- 📧 Envío a Resend
- ✅ Éxito
- ❌ Error
