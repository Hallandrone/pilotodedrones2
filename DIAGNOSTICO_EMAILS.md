# Diagnóstico: Emails de Invitación No Llegan

## Problema
Los emails de invitación de empresa a usuario no están llegando y no pasan por Resend.

## Cambios Realizados

### 1. ✅ Logs Extensivos Agregados
He agregado logs detallados en la Edge Function `send-invitation-email` para rastrear cada paso:
- 🚀 Inicio de la función
- 📥 Recepción de datos
- 🔍 Validación de datos
- 🔑 Verificación de RESEND_API_KEY
- 🗄️ Conexión a Supabase
- 🔍 Búsqueda de token de invitación
- 🔗 Generación de link
- 📧 Preparación y envío a Resend
- 📬 Respuesta de Resend
- 💾 Registro en base de datos

### 2. ✅ Función Desplegada
La función ha sido desplegada exitosamente en Supabase.

## Pasos para Diagnosticar

### Paso 1: Verificar Variables de Entorno en Supabase
1. Ve al Dashboard de Supabase: https://supabase.com/dashboard/project/sncjozwmtjaltoituumx/settings/functions
2. Verifica que `RESEND_API_KEY` esté configurada correctamente
3. Verifica que `FRONTEND_URL` esté configurada (debería ser `https://pilotodedrones.cl`)

### Paso 2: Verificar Configuración de Resend
1. Ve a tu dashboard de Resend: https://resend.com/domains
2. Verifica que el dominio `pilotodedrones.cl` esté verificado
3. Verifica que los registros DNS estén correctos:
   - SPF
   - DKIM
   - DMARC
4. Verifica que tu API Key sea válida y tenga permisos para enviar emails

### Paso 3: Probar el Envío de Invitación
1. Ve a tu aplicación web
2. Inicia sesión como empresa
3. Intenta enviar una invitación a un piloto
4. Observa la consola del navegador para ver si hay errores

### Paso 4: Revisar Logs de Supabase
1. Ve a: https://supabase.com/dashboard/project/sncjozwmtjaltoituumx/logs/edge-functions
2. Busca logs de la función `send-invitation-email`
3. Revisa los logs detallados que agregamos para identificar dónde falla

### Paso 5: Verificar la Tabla de Invitaciones
Ejecuta esta query en Supabase SQL Editor:

```sql
SELECT 
  id,
  pilot_email,
  status,
  email_sent,
  email_sent_at,
  invitation_token,
  created_at
FROM company_pilot_invitations
ORDER BY created_at DESC
LIMIT 10;
```

Verifica:
- ¿Se está creando la invitación?
- ¿Tiene un `invitation_token`?
- ¿El campo `email_sent` está en `false`?

## Posibles Causas del Problema

### 1. ❌ RESEND_API_KEY No Configurada
**Solución**: Configurar la variable de entorno en Supabase Edge Functions

### 2. ❌ Dominio No Verificado en Resend
**Solución**: Verificar el dominio en Resend y configurar los registros DNS

### 3. ❌ API Key Inválida o Sin Permisos
**Solución**: Generar una nueva API Key en Resend con permisos completos

### 4. ❌ La Función No Se Está Llamando
**Solución**: Verificar que el código del frontend esté llamando correctamente a la función

### 5. ❌ Error en la Obtención del Token
**Solución**: Verificar que la tabla `company_pilot_invitations` tenga el campo `invitation_token`

## Comandos Útiles

### Ver logs en tiempo real de Supabase Functions
```bash
npx supabase functions logs send-invitation-email --project-ref sncjozwmtjaltoituumx
```

### Redesplegar la función
```bash
npx supabase functions deploy send-invitation-email
```

### Verificar secretos configurados
```bash
npx supabase secrets list --project-ref sncjozwmtjaltoituumx
```

### Configurar RESEND_API_KEY (si falta)
```bash
npx supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx --project-ref sncjozwmtjaltoituumx
```

### Configurar FRONTEND_URL (si falta)
```bash
npx supabase secrets set FRONTEND_URL=https://pilotodedrones.cl --project-ref sncjozwmtjaltoituumx
```

## Próximos Pasos

1. **Verificar variables de entorno** en Supabase Dashboard
2. **Revisar logs** de la Edge Function después de intentar enviar una invitación
3. **Verificar configuración de Resend** (dominio, DNS, API Key)
4. **Probar con un email real** y verificar si llega

## Información de Contacto de Resend

Si el problema persiste, contacta a soporte de Resend:
- Email: support@resend.com
- Docs: https://resend.com/docs
- Status: https://status.resend.com
