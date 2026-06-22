import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// API key de Meteoblue guardada como secret del servidor (NUNCA en el frontend)
const METEOBLUE_API_KEY = Deno.env.get('METEOBLUE_API_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://app.pilotodedrones.cl',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { latitude, longitude } = await req.json()

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return new Response(
        JSON.stringify({ error: 'latitude y longitude son requeridos (number)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Paquete basic-1h: datos horarios (temperatura, viento, precipitación, etc.)
    const url = `https://my.meteoblue.com/packages/basic-1h?apikey=${METEOBLUE_API_KEY}&lat=${latitude}&lon=${longitude}&format=json`
    const response = await fetch(url)

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Meteoblue error: ${response.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const data = await response.json()
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error en get-weather:', error)
    return new Response(
      JSON.stringify({ error: 'Error interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
