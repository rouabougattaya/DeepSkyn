import { SetMetadata } from '@nestjs/common';

/** Clé de métadonnée : route accessible sans authentification */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marque une route ou un contrôleur comme public : le SessionGuard ne vérifiera pas le token.
 * À utiliser sur login, register, refresh, et éventuellement la racine de l'API.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
