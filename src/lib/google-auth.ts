/**
 * Google Authentication with Supabase Native Integration (Headless)
 */
import { supabase } from "@/integrations/supabase/client";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Tipos para Google Identity Services
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: (callback?: (notification: any) => void) => void;
          renderButton: (element: HTMLElement, config: any) => void;
          cancel: () => void;
        };
      };
    };
  }
}

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture: string;
  role: string;
}

export interface AuthResult {
  success: boolean;
  user?: GoogleUser;
  isNewUser?: boolean;
  error?: string;
}

/**
 * Carga el script de Google
 */
export function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Error cargando Google Script'));
    document.head.appendChild(script);
  });
}

/**
 * Inicializa el cliente de Google con el callback de Supabase
 */
export function initGoogleAuth(
  onSuccess: (result: AuthResult) => void,
  userType: 'pilot' | 'company' = 'pilot'
) {
  if (!window.google?.accounts) return;

  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: async (response: any) => {
      try {
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: response.credential,
        });

        if (error) throw error;

        if (data.user) {
          // Siempre actualizar el proveedor a 'google'
          await supabase
            .from('profiles')
            .update({ auth_provider: 'google' })
            .eq('id', data.user.id);

          // Actualizar user_type solo si es nulo
          await supabase
            .from('profiles')
            .update({ user_type: userType })
            .eq('id', data.user.id)
            .is('user_type', null);

          onSuccess({
            success: true,
            user: {
              id: data.user.id,
              email: data.user.email || '',
              name: data.user.user_metadata.full_name || '',
              picture: data.user.user_metadata.avatar_url || '',
              role: userType
            },
            isNewUser: data.session?.user.created_at === data.session?.user.last_sign_in_at
          });
        }
      } catch (err: any) {
        onSuccess({ success: false, error: err.message });
      }
    },
  });
}

/**
 * Renderiza el botón oficial para conseguir la ventana grande (Imagen 2)
 */
export function renderGoogleButton(containerId: string) {
  const element = document.getElementById(containerId);
  console.log(`[GoogleAuth] Intentando renderizar botón en #${containerId}`, { elementExists: !!element });

  if (!element || !window.google?.accounts) {
    if (!window.google?.accounts) console.warn('[GoogleAuth] window.google.accounts no disponible todavía');
    return;
  }

  // Limpiar contenido previo para evitar duplicados
  element.innerHTML = '';

  try {
    window.google.accounts.id.renderButton(element, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      width: 400 // Forzamos un ancho grande para que cubra todo el botón personalizado
    });
    console.log(`[GoogleAuth] Botón renderizado exitosamente en #${containerId}`);
  } catch (error) {
    console.error(`[GoogleAuth] Error al renderizar botón en #${containerId}:`, error);
  }
}

// Mantener por compatibilidad pero ahora usaremos init + render
export async function signInWithGoogle(userType: 'pilot' | 'company' = 'pilot'): Promise<AuthResult> {
  return new Promise((resolve) => {
    initGoogleAuth((res) => resolve(res), userType);
    window.google?.accounts.id.prompt();
  });
}

export function saveSession(token: string, user: GoogleUser): void { }
export function getAuthUser(): GoogleUser | null { return null; }
export function isAuthenticated(): boolean { return false; }
export async function logout(): Promise<void> { await supabase.auth.signOut(); }
