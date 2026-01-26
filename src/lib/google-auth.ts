/**
 * Google Authentication with custom JWT
 * Uses Google Identity Services (OAuth 2.0) without Supabase Auth
 */

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const AUTH_ENDPOINT = 'https://pilotodedrones.cl/api/auth/google';

// Tipos para Google Identity Services
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GoogleInitConfig) => void;
          prompt: (callback?: (notification: PromptNotification) => void) => void;
          renderButton: (element: HTMLElement, config: GoogleButtonConfig) => void;
          cancel: () => void;
        };
      };
    };
  }
}

interface GoogleInitConfig {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
}

interface GoogleCredentialResponse {
  credential: string;
  select_by: string;
}

interface PromptNotification {
  isDisplayed: () => boolean;
  isNotDisplayed: () => boolean;
  getNotDisplayedReason: () => string;
  isSkippedMoment: () => boolean;
  getSkippedReason: () => string;
  isDismissedMoment: () => boolean;
  getDismissedReason: () => string;
  getMomentType: () => string;
}

interface GoogleButtonConfig {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: number;
  locale?: string;
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
  token?: string;
  user?: GoogleUser;
  isNewUser?: boolean;
  error?: string;
}

// Almacenamiento de sesión
const TOKEN_KEY = 'app_auth_token';
const USER_KEY = 'app_auth_user';

/**
 * Guarda la sesión en localStorage
 */
export function saveSession(token: string, user: GoogleUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Obtiene el token de sesión
 */
export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Obtiene el usuario de la sesión
 */
export function getAuthUser(): GoogleUser | null {
  const userJson = localStorage.getItem(USER_KEY);
  if (!userJson) return null;
  try {
    return JSON.parse(userJson) as GoogleUser;
  } catch {
    return null;
  }
}

/**
 * Verifica si hay una sesión activa
 */
export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

/**
 * Cierra la sesión
 */
export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Verifica el token con el backend
 */
export async function verifySession(): Promise<GoogleUser | null> {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const response = await fetch(`${AUTH_ENDPOINT}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    const data = await response.json();
    
    if (data.valid && data.user) {
      return data.user as GoogleUser;
    }
    
    // Token inválido, limpiar sesión
    logout();
    return null;
  } catch (error) {
    console.error('Error verificando sesión:', error);
    return null;
  }
}

/**
 * Carga el script de Google Identity Services
 */
export function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts) {
      resolve();
      return;
    }

    const existingScript = document.getElementById('google-identity-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-identity-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Error cargando Google Identity Services'));
    document.head.appendChild(script);
  });
}

/**
 * Inicializa Google Identity Services y muestra el One Tap
 */
export async function initGoogleAuth(
  onSuccess: (result: AuthResult) => void,
  onError: (error: string) => void,
  userType: 'pilot' | 'company' = 'pilot'
): Promise<void> {
  try {
    await loadGoogleScript();

    if (!window.google?.accounts) {
      throw new Error('Google Identity Services no disponible');
    }

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (response: GoogleCredentialResponse) => {
        try {
          const result = await authenticateWithGoogle(response.credential, userType);
          if (result.success && result.token && result.user) {
            saveSession(result.token, result.user);
            onSuccess(result);
          } else {
            onError(result.error || 'Error de autenticación');
          }
        } catch (error) {
          onError(error instanceof Error ? error.message : 'Error desconocido');
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });

  } catch (error) {
    onError(error instanceof Error ? error.message : 'Error inicializando Google');
  }
}

/**
 * Muestra el prompt de Google One Tap
 */
export function showGoogleOneTap(): void {
  if (window.google?.accounts) {
    window.google.accounts.id.prompt();
  }
}

/**
 * Inicia el flujo de autenticación con Google
 */
export async function signInWithGoogle(userType: 'pilot' | 'company' = 'pilot'): Promise<AuthResult> {
  return new Promise(async (resolve) => {
    try {
      await loadGoogleScript();

      if (!window.google?.accounts) {
        resolve({ success: false, error: 'Google Identity Services no disponible' });
        return;
      }

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response: GoogleCredentialResponse) => {
          try {
            const result = await authenticateWithGoogle(response.credential, userType);
            if (result.success && result.token && result.user) {
              saveSession(result.token, result.user);
            }
            resolve(result);
          } catch (error) {
            resolve({ 
              success: false, 
              error: error instanceof Error ? error.message : 'Error desconocido' 
            });
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      // Mostrar el prompt de One Tap
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed()) {
          console.log('One Tap not displayed:', notification.getNotDisplayedReason());
          // Fallback: crear un botón temporal invisible y hacer click
          const tempDiv = document.createElement('div');
          tempDiv.style.position = 'fixed';
          tempDiv.style.top = '-9999px';
          document.body.appendChild(tempDiv);
          
          window.google!.accounts.id.renderButton(tempDiv, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
          });
          
          // Click automático en el botón
          setTimeout(() => {
            const button = tempDiv.querySelector('div[role="button"]') as HTMLElement;
            if (button) button.click();
          }, 100);
        }
        
        if (notification.isDismissedMoment()) {
          resolve({ success: false, error: 'Autenticación cancelada' });
        }
      });

    } catch (error) {
      resolve({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      });
    }
  });
}

/**
 * Envía el id_token al backend para autenticar
 */
async function authenticateWithGoogle(idToken: string, userType: string): Promise<AuthResult> {
  const response = await fetch(AUTH_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      id_token: idToken,
      user_type: userType
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return { success: false, error: data.error || 'Error de autenticación' };
  }

  return {
    success: true,
    token: data.token,
    user: data.user,
    isNewUser: data.isNewUser,
  };
}
