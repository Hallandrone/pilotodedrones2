import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const WELCOME_EMAIL_SECRET = Deno.env.get('WELCOME_EMAIL_SECRET') || 'default_secret_for_protection'
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'https://app.pilotodedrones.cl'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-welcome-secret',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const welcomeSecret = req.headers.get('x-welcome-secret')

    if (welcomeSecret !== WELCOME_EMAIL_SECRET) {
      console.warn('Unauthorized access attempt to welcome email function')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { email, full_name } = await req.json()

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (!full_name) {
      console.log('Skipping welcome email: full_name is missing (likely duplicate generic trigger)')
      return new Response(JSON.stringify({ skipped: true, reason: 'Missing full_name' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const name = full_name

    const emailHtml = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>¡Bienvenido a Piloto de Drones!</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; color: #333 text-align: center;">
      <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f7f6;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #083b4e 0%, #0a4a61 100%); padding: 50px 30px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">
                    ¡Bienvenido, ${name}! 🚀
                  </h1>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px; text-align: center;">
                  <p style="margin: 0 0 20px; color: #555555; font-size: 18px; line-height: 1.6;">
                    Estamos muy emocionados de tenerte en nuestra comunidad de pilotos. En <strong>Piloto de Drones</strong>, encontrarás todo lo que necesitas para elevar tu carrera profesional al siguiente nivel.
                  </p>
                  
                  <div style="background-color: #e8f4f8; padding: 25px; border-radius: 12px; margin: 30px 0; text-align: left;">
                    <h3 style="margin: 0 0 15px; color: #083b4e; font-size: 20px; border-bottom: 2px solid #00b3f3; display: inline-block; padding-bottom: 5px;">
                      ¿Qué puedes hacer ahora?
                    </h3>
                    <ul style="margin: 0; padding-left: 20px; color: #4a5568; font-size: 16px; line-height: 2;">
                      <li><strong>Completa tu Perfil:</strong> Muestra tu experiencia y certificaciones.</li>
                      <li><strong>Genera tu QR:</strong> Comparte tu perfil profesional fácilmente.</li>
                      <li><strong>Estado del Tiempo:</strong> Revisa condiciones en tiempo real para tus vuelos.</li>
                      <li><strong>Documentación:</strong> Mantén tus certificados organizados y vigentes.</li>
                    </ul>
                  </div>

                  <p style="margin: 20px 0 30px; color: #555555; font-size: 16px; line-height: 1.6;">
                    Descubre todas las herramientas que hemos diseñado para potenciar tu presencia en el mundo de los drones.
                  </p>

                  <!-- CTA -->
                  <div style="margin: 40px 0;">
                    <a href="${FRONTEND_URL}/dashboard" style="display: inline-block; padding: 18px 45px; background: linear-gradient(135deg, #00b3f3 0%, #0099cc 100%); color: #ffffff; text-decoration: none; border-radius: 50px; font-size: 18px; font-weight: 700; box-shadow: 0 6px 15px rgba(0, 179, 243, 0.4); transition: transform 0.2s ease;">
                      Explorar mi Dashboard
                    </a>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f8fafc; padding: 35px 30px; text-align: center; border-top: 1px solid #edf2f7;">
                  <p style="margin: 0 0 10px; color: #718096; font-size: 14px;">
                    ¿Tienes dudas? visita nuestro centro de ayuda.
                  </p>
                  <p style="margin: 0; color: #a0aec0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
                    © ${new Date().getFullYear()} Piloto de Drones Chile.
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

    if (RESEND_API_KEY) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Piloto de Drones <hola@pilotodedrones.cl>',
          to: email,
          subject: `¡Bienvenido a Piloto de Drones, ${name}!`,
          html: emailHtml
        })
      })

      const data = await res.json()
      console.log('Email sent:', data)
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error: any) {
    console.error('Error sending welcome email:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
