/**
 * Edge Function para integración con Flow Payments API
 * Flow está ACTIVO - Usa sandbox por defecto (VITE_FLOW_ENV=sandbox)
 * Cambia a 'production' para usar el ambiente de producción
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type HttpMethod = 'GET' | 'POST';

function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function signParams(secret: string, params: Record<string, string>): Promise<string> {
  // Según documentación de Flow: ordenar alfabéticamente y concatenar como "nombreParametro valor nombreParametro valor"
  const sortedEntries = Object.entries(params)
    .filter(([key]) => key !== 's')
    .sort(([a], [b]) => a.localeCompare(b));

  // Concatenar en formato: nombreParametro valor nombreParametro valor (sin separadores)
  const baseString = sortedEntries.map(([k, v]) => `${k}${v}`).join('');

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(baseString));
  return toHex(signature);
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const flowEnv = (Deno.env.get('VITE_FLOW_ENV') || 'sandbox').toLowerCase();
    const flowApiKey = Deno.env.get('FLOW_API_KEY');
    const flowSecretKey = Deno.env.get('FLOW_SECRET_KEY');
    const flowBaseSandbox = Deno.env.get('FLOW_API_BASE_SANDBOX') || 'https://sandbox.flow.cl/api';
    const flowBaseProd = Deno.env.get('FLOW_API_BASE_PRODUCTION') || 'https://www.flow.cl/api';

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: 'Supabase environment misconfigured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!flowApiKey || !flowSecretKey) {
      return new Response(JSON.stringify({ error: 'Flow environment variables missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    });

    // Ensure caller is authenticated (avoid exposing secret from client)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { endpoint, method = 'POST', params = {} }: { endpoint: string; method?: HttpMethod; params?: Record<string, string>; } = await req.json();

    if (!endpoint) {
      return new Response(JSON.stringify({ error: 'Missing endpoint' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const baseUrl = flowEnv === 'production' ? flowBaseProd : flowBaseSandbox;

    const fullParams: Record<string, string> = {
      apiKey: flowApiKey,
      ...params,
    };

    const signature = await signParams(flowSecretKey, fullParams);
    const signedParams = { ...fullParams, s: signature };

    const url = `${baseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;

    let response: Response;
    if (method === 'GET') {
      const qs = new URLSearchParams(signedParams).toString();
      response = await fetch(`${url}?${qs}`, { method: 'GET' });
    } else {
      const body = new URLSearchParams(signedParams).toString();
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
    }

    const text = await response.text();
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    const payload = isJson ? JSON.parse(text) : text;

    if (!response.ok) {
      return new Response(JSON.stringify({ error: 'Flow API error', status: response.status, payload }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(isJson ? JSON.stringify(payload) : String(payload), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': isJson ? 'application/json' : 'text/plain' },
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});



