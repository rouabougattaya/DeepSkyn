/** Constantes centralisées pour les sessions (évite la duplication et les magic numbers). */

/** Nombre de rounds bcrypt pour le hash des mots de passe et des tokens. */
export const SALT_ROUNDS = 12;

/** Durée de vie de l'access token (15 minutes). */
export const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;

/** Durée de vie du refresh token (7 jours). */
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Taille en bytes du token aléatoire (crypto.randomBytes). 32 bytes = 64 caractères hex. */
export const TOKEN_BYTES = 32;
