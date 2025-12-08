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
    const reveniuApiKey = Deno.env.get('REVENIU_API_KEY');
    // Reveniu usa la misma API key para webhooks, pero permitimos override con REVENIU_WEBHOOK_SECRET
    const reveniuWebhookSecret = Deno.env.get('REVENIU_WEBHOOK_SECRET') || reveniuApiKey;
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
    console.log('Webhook auth check:', {
      hasSecret: !!reveniuWebhookSecret,
      hasSignature: !!webhookSignature,
      signatureMatch: reveniuWebhookSecret && webhookSignature ? webhookSignature === reveniuWebhookSecret : 'N/A'
    });

    if (reveniuWebhookSecret && webhookSignature) {
      if (webhookSignature !== reveniuWebhookSecret) {
        console.error('❌ Invalid webhook signature');
        return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.log('✅ Webhook signature validated');
    } else if (reveniuWebhookSecret && !webhookSignature) {
      console.warn('⚠️ REVENIU_WEBHOOK_SECRET configured but no signature header received');
    }

    console.log('Reveniu webhook received:', JSON.stringify(payload, null, 2));

    // Reveniu envía el payload en formato: { "data": { "event": "...", "data": { "subscription_id": ..., "subscription_external_id": ... } } }
    const eventData = payload.data?.data || payload.data || payload;
    const eventType = payload.data?.event || payload.event || 'unknown';
    const subscriptionId = eventData.subscription_id || eventData.id || eventData.sub_id;
    const externalId = eventData.subscription_external_id || eventData.external_id;
    const customerEmail = eventData.customer_email || eventData.email || eventData.customer?.email;

    console.log(`Event type: ${eventType}, Subscription ID: ${subscriptionId}, External ID: ${externalId || 'null'}, Customer Email: ${customerEmail || 'null'}`);
    console.log('Full event data:', JSON.stringify(eventData, null, 2));
    console.log('Event data for plan detection:', JSON.stringify({
      plan_id: eventData.plan_id,
      plan_name: eventData.plan_name,
      amount: eventData.amount,
      price: eventData.price,
      plan_amount: eventData.plan_amount,
      customer_email: customerEmail
    }, null, 2));

    if (!subscriptionId) {
      console.log('No subscription ID found in webhook payload');
      return new Response(JSON.stringify({ status: 'ok', message: 'No subscription ID' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mapear eventos a estados de base de datos
    let dbStatus = 'pending';
    let shouldRevertToFree = false;

    if (eventType === 'subscription_activated' || eventType === 'subscription_payment_succeeded') {
      dbStatus = 'active';
    } else if (eventType === 'subscription_deactivated' || eventType === 'subscription_cancelled') {
      dbStatus = 'cancelled';
      shouldRevertToFree = true; // Cambiar a plan gratis al cancelar
    } else if (eventType === 'subscription_expired') {
      dbStatus = 'expired';
      shouldRevertToFree = true; // Cambiar a plan gratis al expirar
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
    // La base de datos acepta: 'basic', 'profesional', 'empresa'
    // El plan de 14.990 corresponde a 'profesional' (Plan Profesional)
    // El plan de 39.990 corresponde a 'empresa' (Plan Empresa)
    let planName = 'profesional'; // Default para el plan de 14.990 (Plan Profesional)

    // Estrategia 1: Detectar por monto (más confiable para diferenciar planes)
    const amount = eventData.amount || eventData.price || eventData.plan_amount || eventData.amount_cents;
    if (amount) {
      const amountNum = typeof amount === 'string' ? parseFloat(amount) : amount;
      // Si viene en centavos, convertir a pesos
      const amountInPesos = amountNum > 1000 ? amountNum / 100 : amountNum;
      console.log(`Amount detected: ${amountNum} (${amountInPesos} pesos)`);

      if (amountInPesos >= 39000 && amountInPesos <= 40000) {
        planName = 'empresa';
        console.log('✅ Detected Plan Empresa by amount (39.990)');
      } else if (amountInPesos >= 14000 && amountInPesos <= 15000) {
        planName = 'profesional';
        console.log('✅ Detected Plan Profesional by amount (14.990)');
      }
    }

    // Estrategia 2: Detectar por plan_name (texto) - solo si no se detectó por monto
    if (planName === 'profesional' && (eventData.plan_id || eventData.plan_name)) {
      const planNameFromEvent = String(eventData.plan_name || '').toLowerCase();
      console.log(`Plan name from event: "${planNameFromEvent}"`);

      if (planNameFromEvent.includes('empresa')) {
        planName = 'empresa';
        console.log('✅ Detected Plan Empresa by name');
      } else if (planNameFromEvent.includes('premium')) {
        planName = 'premium'; // Mantener compatibilidad con 'premium'
        console.log('✅ Detected Plan Premium by name');
      } else if (planNameFromEvent.includes('profesional')) {
        planName = 'profesional';
        console.log('✅ Detected Plan Profesional by name');
      } else if (planNameFromEvent.includes('pro')) {
        planName = 'pro'; // Mantener compatibilidad con 'pro'
        console.log('✅ Detected Plan Pro by name');
      } else if (planNameFromEvent.includes('basic')) {
        planName = 'basic';
        console.log('✅ Detected Plan Basic by name');
      }
    }

    // Estrategia 3: Detectar por plan_id (IDs específicos de Reveniu)
    // Plan Pro (Profesional): ID 9604
    // Plan Empresa: ID 9934
    if (eventData.plan_id) {
      const planId = String(eventData.plan_id);
      console.log(`Plan ID from event: "${planId}"`);

      if (planId === '9934') {
        planName = 'empresa';
        console.log('✅ Detected Plan Empresa by plan_id (9934)');
      } else if (planId === '9604') {
        planName = 'pro';
        console.log('✅ Detected Plan Pro by plan_id (9604)');
      }
    }

    console.log(`✅ Final plan name determined: ${planName}`);

    // Si la suscripción fue cancelada o expiró, cambiar a plan 'free'
    if (shouldRevertToFree) {
      planName = 'free';
      console.log('✅ Reverting to free plan due to cancellation/expiration');
    }

    // Calcular featured_until: 24 horas desde ahora si la suscripción se está activando
    // Solo establecer featured_until si el estado es 'active' y es una activación nueva
    let featuredUntil = null;
    if (dbStatus === 'active') {
      // Verificar si ya existe una suscripción para este usuario
      const { data: existingSubscription } = await supabase
        .from('user_subscriptions')
        .select('featured_until, status')
        .eq('user_id', profile.id)
        .maybeSingle();

      // Si no existe suscripción previa o la anterior no estaba activa, establecer featured_until
      if (!existingSubscription || existingSubscription.status !== 'active') {
        // 24 horas desde ahora
        const now = new Date();
        featuredUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
        console.log(`✅ Setting featured_until to: ${featuredUntil} (24 hours from now)`);
      } else if (existingSubscription.featured_until) {
        // Si ya tiene featured_until, mantenerlo (no resetear)
        featuredUntil = existingSubscription.featured_until;
        console.log(`ℹ️ Keeping existing featured_until: ${featuredUntil}`);
      }
    }

    // Crear o actualizar suscripción
    const upsertData: any = {
      user_id: profile.id,
      plan_name: planName,
      status: dbStatus,
      renewal_date: renewalDate,
      payment_method: eventData.payment_method || 'Tarjeta de Crédito',
      reveniu_subscription_id: String(subscriptionId),
      reveniu_plan_id: eventData.plan_id ? String(eventData.plan_id) : null,
      updated_at: new Date().toISOString(),
    };

    // Solo agregar featured_until si tiene valor
    if (featuredUntil) {
      upsertData.featured_until = featuredUntil;
    }

    // Activar características del Plan Empresa si corresponde
    if ((planName === 'empresa' || planName === 'premium') && dbStatus === 'active') {
      upsertData.whatsapp_priority_support = true;

      // Activar featured para la empresa (30 días)
      const featuredUntilDate = new Date();
      featuredUntilDate.setDate(featuredUntilDate.getDate() + 30);

      // Actualizar la tabla companies si existe
      const { data: companyData } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (companyData) {
        await supabase
          .from('companies')
          .update({
            is_featured: true,
            featured_until: featuredUntilDate.toISOString()
          })
          .eq('id', companyData.id);

        console.log(`✅ Company featured status activated for user: ${profile.id}`);
      }
    } else if (planName !== 'empresa' && planName !== 'premium' || dbStatus !== 'active') {
      // Desactivar características si no es Plan Empresa o no está activo
      upsertData.whatsapp_priority_support = false;
    }

    const { error: upsertError } = await supabase
      .from('user_subscriptions')
      .upsert(upsertData, {
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
