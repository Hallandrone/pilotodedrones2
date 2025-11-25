/**
 * Funciones auxiliares para manejar el estado de certificaciones de pilotos
 */

/**
 * Verifica si una certificación está vigente (no vencida)
 */
export const isCertificationValid = (expiresAt: string | null): boolean => {
  if (!expiresAt) return false;
  return new Date(expiresAt) > new Date();
};

/**
 * Calcula los días restantes hasta la expiración
 * @returns Número de días hasta la expiración, o null si no hay fecha
 */
export const getDaysUntilExpiration = (expiresAt: string | null): number | null => {
  if (!expiresAt) return null;
  const expiration = new Date(expiresAt);
  const now = new Date();
  const diffTime = expiration.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Determina el estado de la certificación
 */
export type CertificationStatus = 'valid' | 'expired' | 'expiring_soon' | 'not_validated';

export const getCertificationStatus = (
  certificationStatus: boolean | null,
  expiresAt: string | null
): CertificationStatus => {
  if (!certificationStatus) return 'not_validated';
  if (!expiresAt) return 'not_validated';
  
  const daysUntilExpiration = getDaysUntilExpiration(expiresAt);
  
  if (daysUntilExpiration === null || daysUntilExpiration < 0) return 'expired';
  if (daysUntilExpiration <= 30) return 'expiring_soon';
  return 'valid';
};

/**
 * Calcula la fecha de expiración (1 año desde hoy)
 */
export const calculateExpirationDate = (): Date => {
  const expirationDate = new Date();
  expirationDate.setFullYear(expirationDate.getFullYear() + 1);
  return expirationDate;
};

/**
 * Formatea la fecha de expiración para mostrar
 */
export const formatExpirationDate = (expiresAt: string | null): string => {
  if (!expiresAt) return 'No definida';
  return new Date(expiresAt).toLocaleDateString('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};



