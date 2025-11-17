/**
 * Cliente de integración con Flow Payments
 * Flow está ACTIVO y configurado para usar sandbox por defecto
 * Configuración: VITE_FLOW_ENV=sandbox (o 'production' para producción)
 */
import { supabase } from '@/integrations/supabase/client';

type HttpMethod = 'GET' | 'POST';

export async function callFlow<T = any>(endpoint: string, method: HttpMethod = 'POST', params: Record<string, string> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('flow-api', {
    body: { endpoint, method, params },
  });
  if (error) throw error;
  return data as T;
}

// Helpers de alto nivel (ajusta los parámetros según tu flujo real)
export async function createPayment(params: {
  amount: string;
  currency?: string;
  order: string;
  concept: string;
  email: string;
  urlConfirmation: string; // webhook público
  urlReturn: string; // URL a la que Flow redirige al usuario
}) {
  return callFlow('payment/create', 'POST', params as Record<string, string>);
}

export interface FlowSubscriptionParams {
  planId: string;
  customerEmail: string;
  customerName?: string;
  urlConfirmation: string; // webhook público
  urlReturn: string; // URL a la que Flow redirige al usuario
  optional?: Record<string, string>; // Parámetros opcionales adicionales
}

export interface FlowSubscriptionResponse {
  token?: string;
  url?: string;
  subscriptionId?: string;
  status?: string;
  [key: string]: any; // Para otros campos que Flow pueda retornar
}

/**
 * Crea una suscripción en Flow
 * Redirige al usuario al checkout de Flow
 */
export async function createSubscription(params: FlowSubscriptionParams): Promise<FlowSubscriptionResponse> {
  const flowParams: Record<string, string> = {
    planId: params.planId,
    customerEmail: params.customerEmail,
    urlConfirmation: params.urlConfirmation,
    urlReturn: params.urlReturn,
  };

  if (params.customerName) {
    flowParams.customerName = params.customerName;
  }

  // Agregar parámetros opcionales si existen
  if (params.optional) {
    Object.assign(flowParams, params.optional);
  }

  return callFlow<FlowSubscriptionResponse>('subscription/create', 'POST', flowParams);
}

/**
 * Obtiene el estado de una suscripción en Flow
 */
export async function getSubscription(subscriptionId: string): Promise<FlowSubscriptionResponse> {
  return callFlow<FlowSubscriptionResponse>('subscription/get', 'GET', {
    subscriptionId,
  });
}

/**
 * Cancela una suscripción en Flow
 */
export async function cancelSubscription(subscriptionId: string): Promise<FlowSubscriptionResponse> {
  return callFlow<FlowSubscriptionResponse>('subscription/cancel', 'POST', {
    subscriptionId,
  });
}

/**
 * Lista las suscripciones de un cliente (opcional)
 */
export async function listSubscriptions(customerEmail?: string): Promise<FlowSubscriptionResponse[]> {
  const params: Record<string, string> = {};
  if (customerEmail) {
    params.customerEmail = customerEmail;
  }
  return callFlow<FlowSubscriptionResponse[]>('subscription/list', 'GET', params);
}



