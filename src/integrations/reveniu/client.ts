import { supabase } from '@/integrations/supabase/client';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface ReveniuPlan {
  id?: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  frequency: 'monthly' | 'quarterly' | 'semiannual' | 'annual';
  trial_days?: number;
}

export interface ReveniuSubscription {
  id?: string;
  plan_id: string;
  customer_email: string;
  customer_name?: string;
  success_url: string;
  cancel_url: string;
  metadata?: Record<string, string>;
}

export interface ReveniuSubscriptionResponse {
  id?: string;
  sub_id?: number;
  link?: string; // URL del checkout según documentación
  checkout_url?: string; // Alias para link
  status?: number;
  status_text?: string;
  result?: boolean;
}

/**
 * Llama a la API de Reveniu a través de la edge function.
 */
export async function callReveniu<T = any>(
  endpoint: string,
  method: HttpMethod = 'POST',
  params: Record<string, any> = {}
): Promise<T> {
  const { data, error } = await supabase.functions.invoke('reveniu-api', {
    body: { endpoint, method, params },
  });
  if (error) throw error;
  return data as T;
}

/**
 * Crea un plan de suscripción en Reveniu
 */
export async function createPlan(plan: ReveniuPlan) {
  const response = await callReveniu<{ id: string; plan?: ReveniuPlan }>('plans', 'POST', plan);
  // Reveniu puede retornar el plan directamente o dentro de un objeto 'plan'
  return { id: response.id || (response as any).plan?.id };
}

/**
 * Obtiene todos los planes de Reveniu
 */
export async function getPlans() {
  return callReveniu<{ plans: ReveniuPlan[] }>('plans', 'GET');
}

/**
 * Obtiene un plan específico por ID
 */
export async function getPlan(planId: string) {
  return callReveniu<{ plan: ReveniuPlan }>(`plans/${planId}`, 'GET');
}

/**
 * Actualiza un plan existente
 */
export async function updatePlan(planId: string, plan: Partial<ReveniuPlan>) {
  return callReveniu<{ plan: ReveniuPlan }>(`plans/${planId}`, 'PUT', plan);
}

/**
 * Crea una suscripción (redirige al cliente al checkout de Reveniu)
 * Según documentación: POST /api/v1/subscriptions/
 */
export async function createSubscription(subscription: ReveniuSubscription) {
  return callReveniu<ReveniuSubscriptionResponse>('subscriptions', 'POST', subscription);
}

/**
 * Obtiene el estado de una suscripción
 * Según documentación: GET /api/v1/subscriptions/{id}
 */
export async function getSubscription(subscriptionId: string) {
  return callReveniu<{ subscription: any }>(`subscriptions/${subscriptionId}`, 'GET');
}

/**
 * Dar de baja una suscripción
 * Según documentación: POST /api/v1/subscriptions/{id}/disable
 */
export async function cancelSubscription(subscriptionId: string) {
  return callReveniu<{ result: boolean; sub_id?: number }>(`subscriptions/${subscriptionId}/disable`, 'POST');
}

/**
 * Reactiva una suscripción fallida
 * Según documentación: POST /api/v1/subscriptions/reactivate/{id}
 */
export async function resumeSubscription(subscriptionId: string) {
  return callReveniu<{ result: boolean }>(`subscriptions/reactivate/${subscriptionId}`, 'POST');
}

