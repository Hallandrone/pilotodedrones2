/**
 * Hook to get the default avatar URL for users without a custom profile picture
 * Returns the Piloto de Drones logo as the default avatar
 */
export const useDefaultAvatar = (avatarUrl: string | null | undefined): string => {
    const DEFAULT_AVATAR = '/piloto de drones-logo.png';

    return avatarUrl || DEFAULT_AVATAR;
};

/**
 * Constant for the default avatar path
 */
export const DEFAULT_AVATAR_URL = '/piloto de drones-logo.png';
