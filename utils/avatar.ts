
export const AVATAR_STYLE = 'glass';

/**
 * Generates a DiceBear avatar URL based on a seed and the current style.
 * @param seed A unique string to generate a consistent avatar for a player.
 * @returns The DiceBear API URL for the avatar.
 */
export const getAvatarUrl = (seed: string): string => {
  return `https://api.dicebear.com/9.x/${AVATAR_STYLE}/svg?seed=${encodeURIComponent(seed)}`;
};
