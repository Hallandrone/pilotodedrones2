import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const reveniuApiKey = Deno.env.get('REVENIU_API_KEY');
    const reveniuEnv = (Deno.env.get('REVENIU_ENV') || 'sandbox').toLowerCase();
    
    // URLs base de Reveniu según documentación oficial
    const reveniuBaseUrl = reveniuEnv === 'production' 
      ? 'https://production.reveniu.com'
      : 'https://integration.reveniu.com';

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: 'Supabase environment misconfigured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!reveniuApiKey) {
      return new Response(JSON.stringify({ error: 'Reveniu API key missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    });

    // Ensure caller is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { endpoint, method = 'POST', params = {} }: { 
      endpoint: string; 
      method?: HttpMethod; 
      params?: Record<string, any> 
    } = await req.json();

    if (!endpoint) {
      return new Response(JSON.stringify({ error: 'Missing endpoint' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Construir URL completa con el prefijo /api/v1/ si no está incluido
    let fullEndpoint = endpoint.replace(/^\//, '');
    if (!fullEndpoint.startsWith('api/v1/')) {
      fullEndpoint = `api/v1/${fullEndpoint}`;
    }
    const url = `${reveniuBaseUrl.replace(/\/$/, '')}/${fullEndpoint}`;

    // Preparar headers para Reveniu
    // Reveniu usa el header 'Reveniu-Secret-Key' según documentación oficial
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Reveniu-Secret-Key': reveniuApiKey,
    };

    let response: Response;
    if (method === 'GET') {
      response = await fetch(url, { 
        method: 'GET',
        headers,
      });
    } else {
      response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(params),
      });
    }

    const text = await response.text();
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    const payload = isJson ? JSON.parse(text) : text;

    if (!response.ok) {
      return new Response(JSON.stringify({ 
        error: 'Reveniu API error', 
        status: response.status, 
        payload 
      }), {
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

