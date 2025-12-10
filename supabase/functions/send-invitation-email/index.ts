import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
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
    const { invitationId, pilotEmail, pilotName, companyName, message }: InvitationEmailRequest = await req.json()

    // Validar datos requeridos
    if (!invitationId || !pilotEmail || !companyName) {
      return new Response(
        JSON.stringify({ error: 'Faltan datos requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Obtener el invitation_token de la base de datos
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: invitationData, error: invitationError } = await supabase
      .from('company_pilot_invitations')
      .select('invitation_token')
      .eq('id', invitationId)
      .single()

    if (invitationError || !invitationData?.invitation_token) {
      console.error('Error obteniendo token:', invitationError)
      throw new Error('No se pudo obtener el token de invitación')
    }

    // Crear link de invitación usando el TOKEN, no el ID
    const invitationLink = `${FRONTEND_URL}/invitation/${invitationData.invitation_token}`

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
