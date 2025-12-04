# Instrucciones para Desplegar el Webhook de Reveniu

## 📋 Checklist Pre-Despliegue

### ✅ Código Verificado
- [x] Webhook actualizado con manejo correcto del formato de Reveniu
- [x] URL de sandbox corregida a `https://sandbox.reveniu.com`
- [x] Estrategias de búsqueda de usuario implementadas
- [x] Mapeo de eventos a estados correcto

## 🚀 Pasos para Desplegar

### Opción 1: Desde Supabase Dashboard (Recomendado)

1. **Accede al Dashboard de Supabase**
   - Ve a https://supabase.com/dashboard
   - Selecciona tu proyecto: `sncjozwmtjaltoituumx`

2. **Ve a Edge Functions**
   - En el menú lateral, busca **"Edge Functions"**
   - O ve directamente a: https://supabase.com/dashboard/project/sncjozwmtjaltoituumx/functions

3. **Despliega o Actualiza la Función**
   - Si `reveniu-webhook` ya existe, haz clic en **"Edit"** o **"Update"**
   - Si no existe, haz clic en **"Create a new function"** y nómbrala `reveniu-webhook`
   - Copia el contenido completo de `supabase/functions/reveniu-webhook/index.ts`
   - Pega el código en el editor
   - Haz clic en **"Deploy"** o **"Save"**

4. **Configura Variables de Entorno**
   - En la página de la función, ve a la pestaña **"Settings"** o **"Environment Variables"**
   - Agrega las siguientes variables:
     ```
     REVENIU_API_KEY=tu_api_key_de_reveniu
     REVENIU_WEBHOOK_SECRET=tu_secreto_webhook (opcional pero recomendado)
     REVENIU_ENV=sandbox (o 'production' para producción)
     ```
   - **Nota**: `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` se configuran automáticamente

5. **Obtén la URL del Webhook**
   - Después del despliegue, verás la URL de la función
   - Será algo como: `https://sncjozwmtjaltoituumx.supabase.co/functions/v1/reveniu-webhook`
   - Copia esta URL

6. **Configura el Webhook en Reveniu**
   - Ve a tu panel de Reveniu (sandbox o producción)
   - Busca la sección de **Webhooks** o **Configuración de Webhooks**
   - Agrega la URL del webhook: `https://sncjozwmtjaltoituumx.supabase.co/functions/v1/reveniu-webhook`
   - Si configuraste `REVENIU_WEBHOOK_SECRET`, agrégalo también en Reveniu
   - Guarda la configuración

### Opción 2: Usando Supabase CLI (Si lo tienes instalado)

```bash
# 1. Inicia sesión en Supabase
supabase login

# 2. Enlaza tu proyecto
supabase link --project-ref sncjozwmtjaltoituumx

# 3. Despliega la función
supabase functions deploy reveniu-webhook

# 4. Configura variables de entorno
supabase secrets set REVENIU_API_KEY=tu_api_key_de_reveniu
supabase secrets set REVENIU_WEBHOOK_SECRET=tu_secreto_webhook
supabase secrets set REVENIU_ENV=sandbox
```

## ✅ Verificación Post-Despliegue

1. **Verifica que la función esté activa**
   - En el dashboard, la función debe aparecer como **"Active"**

2. **Prueba el webhook**
   - Haz un pago de prueba en Reveniu
   - Revisa los logs de la función en Supabase Dashboard
   - Verifica que la suscripción se active en la base de datos

3. **Revisa los logs**
   - En la función, ve a la pestaña **"Logs"**
   - Deberías ver mensajes como:
     - `Reveniu webhook received: ...`
     - `Event type: subscription_payment_succeeded`
     - `Subscription X updated with status: active`

## 🔧 Troubleshooting

### Si el webhook no recibe eventos:
- Verifica que la URL esté correctamente configurada en Reveniu
- Verifica que el `REVENIU_WEBHOOK_SECRET` coincida en ambos lados
- Revisa los logs de la función para ver errores

### Si no encuentra al usuario:
- Verifica que el email del usuario en Reveniu coincida con el email en la tabla `profiles`
- Revisa los logs para ver qué estrategia de búsqueda se está usando
- Verifica que `REVENIU_API_KEY` esté configurada correctamente

### Si la suscripción no se activa:
- Verifica que la tabla `user_subscriptions` tenga las columnas necesarias
- Revisa los logs para ver si hay errores de base de datos
- Verifica que el `user_id` sea correcto

## 📝 Notas Importantes

- El webhook maneja automáticamente 3 estrategias para encontrar al usuario:
  1. Por `external_id` (si está disponible)
  2. Por `subscription_id` existente en la base de datos
  3. Llamando a la API de Reveniu para obtener el email del cliente

- Los eventos que activan la suscripción:
  - `subscription_activated` → `active`
  - `subscription_payment_succeeded` → `active`

- Los eventos que cancelan la suscripción:
  - `subscription_deactivated` → `cancelled`
  - `subscription_cancelled` → `cancelled`

