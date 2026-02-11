import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ContactMessage {
    name: string;
    email: string;
    subject: string;
    message: string;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { record } = await req.json()
        const { name, email, subject, message } = record as ContactMessage

        console.log(`Sending contact notification for: ${name} (${email})`)

        const emailHtml = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; }
          .header { background: #083b4e; color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center; }
          .content { padding: 20px; }
          .field { margin-bottom: 15px; }
          .label { font-weight: bold; color: #00b3f3; display: block; margin-bottom: 5px; }
          .value { background: #f9f9f9; padding: 10px; border-radius: 5px; border: 1px solid #eee; }
          .footer { text-align: center; font-size: 12px; color: #999; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin:0">Nuevo Mensaje de Contacto</h1>
          </div>
          <div class="content">
            <div class="field">
              <span class="label">Nombre:</span>
              <div class="value">${name}</div>
            </div>
            <div class="field">
              <span class="label">Email:</span>
              <div class="value">${email}</div>
            </div>
            <div class="field">
              <span class="label">Asunto:</span>
              <div class="value">${subject || 'Sin asunto'}</div>
            </div>
            <div class="field">
              <span class="label">Mensaje:</span>
              <div class="value" style="white-space: pre-wrap;">${message}</div>
            </div>
          </div>
          <div class="footer">
            <p>Este es un mensaje automático de Piloto de Drones Chile</p>
          </div>
        </div>
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
                    from: 'Piloto de Drones <notificaciones@pilotodedrones.cl>',
                    to: ['cofre@live.cl', 'Hallan@academiadronchile.cl'],
                    subject: `Nuevo Contacto: ${subject || name}`,
                    html: emailHtml
                })
            })

            const data = await res.json()
            console.log('Notification email sent via Resend:', data)
        } else {
            console.error('RESEND_API_KEY is not set')
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    } catch (error: any) {
        console.error('Error in send-contact-email function:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
