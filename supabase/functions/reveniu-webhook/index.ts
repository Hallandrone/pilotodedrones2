import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const reveniuWebhookSecret = Deno.env.get('REVENIU_WEBHOOK_SECRET');
    const reveniuApiKey = Deno.env.get('REVENIU_API_KEY');
    const reveniuEnv = (Deno.env.get('REVENIU_ENV') || 'sandbox').toLowerCase();

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Supabase environment misconfigured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Crear cliente con service role key para poder actualizar cualquier registro
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Obtener el webhook payload
    const payload = await req.json();
    
    // Validar webhook secret si está configurado
    const webhookSignature = req.headers.get('reveniu-secret-key') || req.headers.get('Reveniu-Secret-Key') || '';
    if (reveniuWebhookSecret && webhookSignature) {
      if (webhookSignature !== reveniuWebhookSecret) {
        return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log('Reveniu webhook received:', JSON.stringify(payload, null, 2));

    // Reveniu envía el payload en formato: { "data": { "event": "...", "data": { "subscription_id": ..., "subscription_external_id": ... } } }
    const eventData = payload.data?.data || payload.data || payload;
    const eventType = payload.data?.event || payload.event || 'unknown';
    const subscriptionId = eventData.subscription_id || eventData.id || eventData.sub_id;
    const externalId = eventData.subscription_external_id || eventData.external_id;

    console.log(`Event type: ${eventType}, Subscription ID: ${subscriptionId}, External ID: ${externalId || 'null'}`);

    if (!subscriptionId) {
      console.log('No subscription ID found in webhook payload');
      return new Response(JSON.stringify({ status: 'ok', message: 'No subscription ID' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mapear eventos a estados de base de datos
    let dbStatus = 'pending';
    if (eventType === 'subscription_activated' || eventType === 'subscription_payment_succeeded') {
      dbStatus = 'active';
    } else if (eventType === 'subscription_deactivated' || eventType === 'subscription_cancelled') {
      dbStatus = 'cancelled';
    } else if (eventType === 'subscription_expired') {
      dbStatus = 'expired';
    } else if (eventType === 'subscription_payment_failed') {
      dbStatus = 'pending'; // Pago fallido, pero puede recuperarse
    }

    console.log(`Mapped status: ${dbStatus}`);

    // Buscar usuario
    let profile = null;
    let customerEmail = null;

    // Estrategia 1: Si hay external_id, usarlo directamente (debería ser el user_id)
    if (externalId) {
      console.log(`✅ Using external_id to find user: ${externalId}`);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('id', externalId)
        .maybeSingle();
      
      if (profileData) {
        profile = profileData;
        customerEmail = profileData.email;
        console.log(`✅ Found user by external_id: ${profile.id}`);
      } else {
        console.log(`❌ User not found with external_id: ${externalId}`);
        if (profileError) {
          console.error('Profile query error:', profileError);
        }
      }
    }

    // Estrategia 2: Buscar por subscription_id en user_subscriptions si ya existe
    if (!profile) {
      console.log('No external_id, trying to find by subscription_id');
      const { data: existingSubscription, error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .select('user_id')
        .eq('reveniu_subscription_id', String(subscriptionId))
        .maybeSingle();

      if (existingSubscription) {
        console.log(`✅ Found existing subscription for user: ${existingSubscription.user_id}`);
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('id', existingSubscription.user_id)
          .maybeSingle();
        
        if (profileData) {
          profile = profileData;
          customerEmail = profileData.email;
          console.log(`✅ Found user by existing subscription: ${profile.id}`);
        } else {
          console.log(`❌ Profile not found for user_id: ${existingSubscription.user_id}`);
          if (profileError) {
            console.error('Profile query error:', profileError);
          }
        }
      } else {
        console.log(`No existing subscription found with reveniu_subscription_id: ${subscriptionId}`);
        if (subscriptionError) {
          console.error('Subscription query error:', subscriptionError);
        }
      }
    }

    // Estrategia 3: Si no encontramos al usuario, intentar obtener datos de la API de Reveniu
    if (!profile && reveniuApiKey) {
      console.log('Trying to find user with pending subscription');
      console.log(`REVENIU_ENV: ${reveniuEnv}`);
      console.log(`Subscription ID to fetch: ${subscriptionId}`);
      
      try {
        const reveniuBaseUrl = reveniuEnv === 'production' 
          ? 'https://production.reveniu.com'
          : 'https://sandbox.reveniu.com';
        
        const apiUrl = `${reveniuBaseUrl}/api/v1/subscriptions/${subscriptionId}`;
        console.log(`Calling Reveniu API: ${apiUrl}`);
        
        const apiResponse = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Reveniu-Secret-Key': reveniuApiKey,
          },
        });

        console.log(`API Response status: ${apiResponse.status} ${apiResponse.statusText}`);
        const contentType = apiResponse.headers.get('content-type') || '';
        console.log(`API Response Content-Type: ${contentType}`);
        
        if (apiResponse.ok) {
          // Verificar que la respuesta sea JSON antes de parsear
          if (!contentType.includes('application/json')) {
            // Si no es JSON, leer como texto para debugging
            const responseText = await apiResponse.text();
            console.error(`❌ API returned non-JSON response (${contentType}):`, responseText.substring(0, 500));
            
            // Intentar con formato de autenticación alternativo
            console.log('Trying alternative authentication format (Authorization Bearer)...');
            try {
              const apiResponseAlt = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${reveniuApiKey}`,
                },
              });
              
              const contentTypeAlt = apiResponseAlt.headers.get('content-type') || '';
              console.log(`Alternative auth Content-Type: ${contentTypeAlt}`);
              
              if (contentTypeAlt.includes('application/json') && apiResponseAlt.ok) {
                const subscriptionData = await apiResponseAlt.json();
                console.log('✅ API Response (alternative auth):', JSON.stringify(subscriptionData, null, 2));
                
                // Procesar con autenticación alternativa exitosa
                const subscription = subscriptionData.subscription || subscriptionData.data || subscriptionData;
                customerEmail = subscription.customer_email || subscription.email || subscription.customer?.email;
                
                console.log(`Extracted customer email: ${customerEmail || 'NOT FOUND'}`);

                if (customerEmail && typeof customerEmail === 'string') {
                  const normalizedEmail = customerEmail.toLowerCase().trim();
                  console.log(`Searching for profile with email: ${normalizedEmail}`);
                  const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, email')
                    .eq('email', normalizedEmail)
                    .maybeSingle();

                  if (profileData) {
                    profile = profileData;
                    console.log(`✅ Found user by email from API: ${profile.id}`);
                  } else {
                    console.log(`❌ Profile not found for email: ${normalizedEmail}`);
                    if (profileError) {
                      console.error('Profile query error:', profileError);
                    }
                    // Intentar búsqueda case-insensitive
                    const { data: profileDataCaseInsensitive } = await supabase
                      .from('profiles')
                      .select('id, email')
                      .ilike('email', normalizedEmail)
                      .maybeSingle();
                    
                    if (profileDataCaseInsensitive) {
                      profile = profileDataCaseInsensitive;
                      console.log(`✅ Found user by email (case-insensitive): ${profile.id}`);
                    }
                  }
                } else {
                  console.log('❌ No customer email found in API response');
                }
              } else {
                const altText = await apiResponseAlt.text();
                console.error(`❌ Alternative auth also failed (${apiResponseAlt.status}):`, altText.substring(0, 500));
                throw new Error(`API returned HTML instead of JSON. Check API key and endpoint. Status: ${apiResponseAlt.status}`);
              }
            } catch (altError) {
              console.error('❌ Error with alternative auth:', altError);
              throw new Error(`API returned HTML instead of JSON. Original error: ${responseText.substring(0, 200)}`);
            }
          } else {
            // Es JSON, procesar normalmente
            const subscriptionData = await apiResponse.json();
            console.log('API Response data:', JSON.stringify(subscriptionData, null, 2));
            
            // Intentar diferentes formatos de respuesta
            const subscription = subscriptionData.subscription || subscriptionData.data || subscriptionData;
            customerEmail = subscription.customer_email || subscription.email || subscription.customer?.email;
            
            console.log(`Extracted customer email: ${customerEmail || 'NOT FOUND'}`);

            if (customerEmail && typeof customerEmail === 'string') {
              const normalizedEmail = customerEmail.toLowerCase().trim();
              console.log(`Searching for profile with email: ${normalizedEmail}`);
              const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('id, email')
                .eq('email', normalizedEmail)
                .maybeSingle();

              if (profileData) {
                profile = profileData;
                console.log(`✅ Found user by email from API: ${profile.id}`);
              } else {
                console.log(`❌ Profile not found for email: ${normalizedEmail}`);
                if (profileError) {
                  console.error('Profile query error:', profileError);
                }
                // Intentar búsqueda case-insensitive
                const { data: profileDataCaseInsensitive } = await supabase
                  .from('profiles')
                  .select('id, email')
                  .ilike('email', normalizedEmail)
                  .maybeSingle();
                
                if (profileDataCaseInsensitive) {
                  profile = profileDataCaseInsensitive;
                  console.log(`✅ Found user by email (case-insensitive): ${profile.id}`);
                }
              }
            } else {
              console.log('❌ No customer email found in API response');
            }
          }
        } else {
          const errorText = await apiResponse.text();
          console.error(`❌ API Error (${apiResponse.status}):`, errorText.substring(0, 500));
        }
      } catch (apiError) {
        console.error('❌ Error calling Reveniu API:', apiError);
        if (apiError instanceof Error) {
          console.error('Error message:', apiError.message);
          console.error('Error stack:', apiError.stack);
        }
      }
    } else if (!profile && !reveniuApiKey) {
      console.log('⚠️ REVENIU_API_KEY not configured, cannot fetch subscription details from API');
    }

    if (!profile) {
      console.log('Could not find user to update subscription');
      return new Response(JSON.stringify({ 
        status: 'ok', 
        message: 'User not found',
        subscription_id: subscriptionId 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calcular fecha de renovación (si está disponible en el evento)
    const renewalDate = eventData.next_due_date || 
                       eventData.next_billing_date || 
                       eventData.due_date || 
                       null;

    // Determinar el nombre del plan
    // La base de datos solo acepta: 'basic', 'pro', 'premium'
    // El plan de 14.990 corresponde a 'pro' (Plan Profesional)
    let planName = 'pro'; // Default para el plan de 14.990 (Plan Profesional)
    if (eventData.plan_id || eventData.plan_name) {
      // Mapear nombres de plan a valores permitidos en la BD
      const planNameFromEvent = eventData.plan_name || '';
      if (planNameFromEvent.toLowerCase().includes('empresa') || planNameFromEvent.toLowerCase().includes('premium')) {
        planName = 'premium';
      } else if (planNameFromEvent.toLowerCase().includes('profesional') || planNameFromEvent.toLowerCase().includes('pro')) {
        planName = 'pro';
      } else if (planNameFromEvent.toLowerCase().includes('basic')) {
        planName = 'basic';
      }
      // Si viene un plan_id, podrías mapearlo aquí según tus planes en Reveniu
    }

    // Crear o actualizar suscripción
    const { error: upsertError } = await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: profile.id,
        plan_name: planName,
        status: dbStatus,
        renewal_date: renewalDate,
        payment_method: eventData.payment_method || 'Tarjeta de Crédito',
        reveniu_subscription_id: String(subscriptionId),
        reveniu_plan_id: eventData.plan_id ? String(eventData.plan_id) : null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (upsertError) {
      console.error('Error updating subscription:', upsertError);
      return new Response(JSON.stringify({ 
        status: 'error', 
        message: upsertError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`✅ Subscription ${subscriptionId} updated with status: ${dbStatus} for user: ${profile.id}`);

    return new Response(JSON.stringify({ 
      status: 'ok', 
      received: true,
      subscription_id: subscriptionId,
      user_id: profile.id,
      subscription_status: dbStatus
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
