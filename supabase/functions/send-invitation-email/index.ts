import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'https://pilotodedrones.cl'

interface InvitationEmailRequest {
  invitationId: string
  pilotEmail: string
  pilotName: string
  companyName: string
  message?: string
}

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    let body: any = {}

    // Intentar leer body si es POST
    if (req.method === 'POST') {
      try {
        body = await req.json()
      } catch (e) {
        // Body vacío o inválido
      }
    }

    // Lógica para obtener detalles (GET o POST con action='get_invitation')
    // Soportamos ambos para máxima compatibilidad
    const isGetRequest = req.method === 'GET'
    const isGetAction = body.action === 'get_invitation' || body.action === 'get-invitation'

    if (isGetRequest || isGetAction) {
      const invitationId = isGetRequest
        ? url.searchParams.get('id')
        : (body.id || body.invitationId)

      if (!invitationId) {
        return new Response(
          JSON.stringify({ error: 'ID de invitación requerido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('🔍 Buscando invitación:', invitationId)
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

      // Usamos service role para saltar RLS
      const { data, error } = await supabase
        .from('company_pilot_invitations')
        .select(`
          id,
          pilot_email,
          message,
          invited_at,
          status,
          company:companies!company_pilot_invitations_company_id_fkey (
            company_name
          )
        `)
        .eq('id', invitationId)
        .eq('status', 'pending')
        .single()

      if (error || !data) {
        console.error('❌ Invitación no encontrada:', error)
        return new Response(
          JSON.stringify({ error: 'Invitación no encontrada o expirada' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify(data),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Acción: Aceptar invitación
    if (body.action === 'accept_invitation') {
      console.log('🚀 Iniciando aceptación de invitación')
      const { invitationId } = body
      const authHeader = req.headers.get('Authorization')

      if (!authHeader) {
        console.error('❌ Falta header Authorization')
        return new Response(
          JSON.stringify({ success: false, error: 'No autorizado: Falta token de sesión' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // 1. Obtener usuario autenticado con manejo de errores
      let user = null
      try {
        if (!SUPABASE_ANON_KEY) {
          throw new Error('Falta configuración del servidor (ANON_KEY)')
        }

        const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } })
        const { data, error: userError } = await supabaseClient.auth.getUser()

        if (userError) {
          console.error('❌ Error validando usuario:', userError)
          return new Response(
            JSON.stringify({ success: false, error: `Auth Error: ${userError.message}` }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        user = data.user
      } catch (err: any) {
        console.error('❌ Error interno auth:', err)
        return new Response(
          JSON.stringify({ success: false, error: `Internal Auth Error: ${err.message}` }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!user) {
        console.error('❌ No se encontró usuario en la sesión')
        return new Response(
          JSON.stringify({ success: false, error: 'Usuario no identificado en la sesión' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('👤 Usuario aceptando:', user.email, user.id)

      // Usar admin client para operaciones de base de datos
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

      // 2. Obtener invitación
      const { data: invitation, error: invError } = await supabaseAdmin
        .from('company_pilot_invitations')
        .select('*')
        .eq('id', invitationId)
        .eq('status', 'pending')
        .single()

      if (invError || !invitation) {
        return new Response(
          JSON.stringify({ error: 'Invitación no encontrada o ya procesada' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // 3. Validar que el usuario corresponde a la invitación
      // Si invitation.pilot_id es NULL (usuario nuevo), validamos por email
      // Si invitation.pilot_id existe, debe coincidir con user.id
      const userEmail = user.email?.toLowerCase().trim()
      const invEmail = invitation.pilot_email.toLowerCase().trim()

      let isValido = false
      if (invitation.pilot_id) {
        if (invitation.pilot_id === user.id) isValido = true
      } else {
        if (invEmail === userEmail) isValido = true // Coincidencia por email
      }

      if (!isValido) {
        return new Response(
          JSON.stringify({ error: 'Esta invitación no corresponde a tu usuario' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('✅ Validación exitosa. Procesando aceptación...')

      // 4. Actualizar invitación con el ID real del usuario si faltaba
      if (!invitation.pilot_id) {
        await supabaseAdmin
          .from('company_pilot_invitations')
          .update({ pilot_id: user.id })
          .eq('id', invitationId)
      }

      // 5. ASEGURAR que el registro en COMPANIES existe
      // (La invitación tiene company_id que apunta a profiles, pero company_pilots requiere companies.id)
      const { data: existingCompany } = await supabaseAdmin
        .from('companies')
        .select('id')
        .eq('user_id', invitation.company_id)
        .maybeSingle()

      let companyRecordId = existingCompany?.id

      if (!companyRecordId) {
        console.log('⚠️ Registro en companies no existe, creando...')
        // Obtener info de la empresa desde profiles
        const { data: companyProfile } = await supabaseAdmin
          .from('profiles')
          .select('company_name, full_name')
          .eq('id', invitation.company_id)
          .single()

        // Crear el registro en companies
        const { data: newCompany, error: companyError } = await supabaseAdmin
          .from('companies')
          .insert({
            user_id: invitation.company_id,
            company_name: companyProfile?.company_name || companyProfile?.full_name || 'Empresa'
          })
          .select('id')
          .single()

        if (companyError) {
          console.error('Error creating company record:', companyError)
          throw new Error('Error al crear registro de empresa')
        }

        companyRecordId = newCompany.id
        console.log('✅ Registro de empresa creado:', companyRecordId)
      }

      // 6. ASEGURAR que el registro en PILOTS existe
      const { data: existingPilotRecord } = await supabaseAdmin
        .from('pilots')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      let pilotRecordId = existingPilotRecord?.id

      if (!pilotRecordId) {
        console.log('⚠️ Registro en pilots no existe, creando...')
        const { data: newPilot, error: pilotError } = await supabaseAdmin
          .from('pilots')
          .insert({
            user_id: user.id
          })
          .select('id')
          .single()

        if (pilotError) {
          console.error('Error creating pilot record:', pilotError)
          throw new Error('Error al crear registro de piloto')
        }

        pilotRecordId = newPilot.id
        console.log('✅ Registro de piloto creado:', pilotRecordId)
      }

      // 7. Verificar si ya está en company_pilots (para evitar duplicados)
      const { data: existingAssociation } = await supabaseAdmin
        .from('company_pilots')
        .select('id')
        .eq('company_id', companyRecordId!)
        .eq('pilot_id', pilotRecordId!)
        .maybeSingle()

      if (!existingAssociation) {
        console.log('📝 Agregando piloto a empresa...')
        // Agregar a company_pilots usando los IDs CORRECTOS
        const { error: addError } = await supabaseAdmin
          .from('company_pilots')
          .insert({
            company_id: companyRecordId!,
            pilot_id: pilotRecordId!
          })

        if (addError) {
          console.error('Error adding pilot to company:', addError)
          throw new Error('Error al unirse a la empresa')
        }
        console.log('✅ Piloto agregado a empresa exitosamente')
      } else {
        console.log('ℹ️ Piloto ya pertenece a la empresa')
      }

      // 6. ACTIVAR PLAN PRO (Upsert subscription)
      // Buscamos suscripción actual
      const { data: existingSub } = await supabaseAdmin
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      const unAnioMas = new Date()
      unAnioMas.setFullYear(unAnioMas.getFullYear() + 1)

      if (existingSub) {
        await supabaseAdmin
          .from('user_subscriptions')
          .update({
            plan_name: 'pro',
            status: 'active',
            payment_method: 'company_sponsored', // Marca especial
            renewal_date: unAnioMas.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
      } else {
        await supabaseAdmin
          .from('user_subscriptions')
          .insert({
            user_id: user.id,
            plan_name: 'pro',
            status: 'active',
            payment_method: 'company_sponsored',
            renewal_date: unAnioMas.toISOString()
          })
      }

      // 7. Marcar invitación como aceptada
      await supabaseAdmin
        .from('company_pilot_invitations')
        .update({
          status: 'accepted',
          responded_at: new Date().toISOString(),
          pilot_id: user.id // Asegurar que quede linkeado
        })
        .eq('id', invitationId)

      // 8. Notificación (opcional)
      await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: user.id,
          type: 'welcome_company',
          title: 'Bienvenido al equipo',
          message: 'Has sido añadido correctamente y tu Plan Pro está activo.',
          data: { company_id: invitation.company_id }
        })

      return new Response(
        JSON.stringify({ success: true, message: 'Invitación aceptada correctamente' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Acción: Restaurar Plan Pro (Autocuración)
    if (body.action === 'restore_pro_subscription') {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } })
      const { data: { user } } = await supabaseClient.auth.getUser()

      if (!user) {
        return new Response(JSON.stringify({ success: false, error: 'Usuario no encontrado' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

      // Verificar si es piloto de empresa
      const { data: pilotRecord } = await supabaseAdmin
        .from('company_pilots')
        .select('id')
        .eq('pilot_id', user.id)
        .maybeSingle()

      if (pilotRecord) {
        // Es piloto de empresa, forzar Pro
        const unAnioMas = new Date()
        unAnioMas.setFullYear(unAnioMas.getFullYear() + 1)

        await supabaseAdmin.from('user_subscriptions').upsert({
          user_id: user.id,
          plan_name: 'pro',
          status: 'active',
          payment_method: 'company_sponsored_restore',
          renewal_date: unAnioMas.toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })

        return new Response(JSON.stringify({ success: true, message: 'Plan restaurado a Pro' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      } else {
        return new Response(JSON.stringify({ success: false, error: 'No eres piloto de empresa' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    // POST: Enviar email de invitación (si tiene datos de email)
    if (req.method === 'POST' && body.pilotEmail) {
      const { invitationId, pilotEmail, pilotName, companyName, message } = body

      // Validar datos requeridos
      if (!invitationId || !pilotEmail || !companyName) {
        return new Response(
          JSON.stringify({ error: 'Faltan datos requeridos' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Crear link de invitación
      const invitationLink = `${FRONTEND_URL}/invitation/${invitationId}`

      // Preparar el HTML del email
      const emailHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitación a unirte a ${companyName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #083b4e 0%, #0a4a61 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                ¡Tienes una invitación!
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                Hola ${pilotName || 'Piloto'},
              </p>
              
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                <strong>${companyName}</strong> te ha invitado a unirte a su equipo de pilotos en <strong>Piloto de Drones</strong>.
              </p>

              ${message ? `
              <div style="background-color: #f8f9fa; border-left: 4px solid #00b3f3; padding: 15px 20px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #555555; font-size: 14px; font-style: italic;">
                  "${message}"
                </p>
              </div>
              ` : ''}

              <div style="background-color: #e8f4f8; padding: 20px; border-radius: 8px; margin: 30px 0;">
                <h3 style="margin: 0 0 15px; color: #083b4e; font-size: 18px;">
                  🎁 Beneficios al unirte:
                </h3>
                <ul style="margin: 0; padding-left: 20px; color: #555555; font-size: 14px; line-height: 1.8;">
                  <li><strong>Plan Pro GRATIS</strong> mientras seas parte del equipo</li>
                  <li>Perfil público destacado</li>
                  <li>Acceso a condiciones meteorológicas en tiempo real</li>
                  <li>Certificados y documentación profesional</li>
                  <li>Código QR personalizado</li>
                  <li>Visibilidad en búsquedas prioritarias</li>
                </ul>
              </div>

              <p style="margin: 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Para aceptar esta invitación y activar tu <strong>Plan Pro gratuito</strong>, haz clic en el siguiente botón:
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${invitationLink}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #00b3f3 0%, #0099cc 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(0, 179, 243, 0.3);">
                      Aceptar Invitación
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
                O copia y pega este enlace en tu navegador:
              </p>
              <p style="margin: 5px 0 0; color: #00b3f3; font-size: 14px; word-break: break-all;">
                ${invitationLink}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px; color: #666666; font-size: 14px;">
                ¿Tienes preguntas? Contáctanos en <a href="mailto:soporte@pilotodedrones.cl" style="color: #00b3f3; text-decoration: none;">soporte@pilotodedrones.cl</a>
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px;">
                © ${new Date().getFullYear()} Piloto de Drones. Todos los derechos reservados.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `

      // Enviar email con Resend
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Piloto de Drones <invitaciones@pilotodedrones.cl>',
          to: [pilotEmail],
          subject: `${companyName} te invita a unirte a su equipo - Plan Pro GRATIS`,
          html: emailHtml,
        }),
      })

      const resendData = await resendResponse.json()

      if (!resendResponse.ok) {
        console.error('Error de Resend:', resendData)
        throw new Error(resendData.message || 'Error al enviar email')
      }

      // Registrar envío en Supabase
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

      await supabase
        .from('company_pilot_invitations')
        .update({
          email_sent: true,
          email_sent_at: new Date().toISOString()
        })
        .eq('id', invitationId)

      return new Response(
        JSON.stringify({
          success: true,
          emailId: resendData.id,
          message: 'Email enviado correctamente'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Método no permitido' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
