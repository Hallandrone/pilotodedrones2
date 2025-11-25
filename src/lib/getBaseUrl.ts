/**
 * Obtiene la URL base de la aplicación según el entorno
 * Prioridad:
 * 1. VITE_APP_URL (definida explícitamente)
 * 2. VITE_VERCEL_URL (previews de Vercel)
 * 3. window.location.origin (fallback dinámico)
 * 4. http://localhost:8081 (solo en desarrollo si no hay window)
 */
export function getBaseUrl(): string {
  // En build time o server-side
  if (typeof window === 'undefined') {
    const viteAppUrl = import.meta.env.VITE_APP_URL;
    if (viteAppUrl) return viteAppUrl;
    
    const vercelUrl = import.meta.env.VITE_VERCEL_URL;
    if (vercelUrl) return `https://${vercelUrl}`;
    
    return 'http://localhost:8081';
  }

  // En runtime (client-side)
  const viteAppUrl = import.meta.env.VITE_APP_URL;
  if (viteAppUrl) return viteAppUrl;

  // Fallback a window.location.origin (dinámico)
  return window.location.origin;
}

/**
 * Obtiene la URL base sin trailing slash
 */
export function getBaseUrlClean(): string {
  const url = getBaseUrl();
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

