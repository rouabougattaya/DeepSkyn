/**
 * Session auth (sans JWT) : Access token courte durée, Refresh token longue durée.
 * Stockage côté client (localStorage) ; tokens opaques gérés côté serveur.
 */

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api"

const KEY_ACCESS = "accessToken"
const KEY_REFRESH = "refreshToken"
const KEY_USER = "user"
const KEY_ACCESS_EXPIRES = "accessTokenExpiresAt"

export interface SessionUser {
  id: string
  email: string
  firstName: string
  lastName: string
  name?: string
  aiScore?: number
  aiVerified?: boolean
  picture?: string;
  authMethod?: string;
  bio?: string;
}

export interface SessionTokens {
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: string
  refreshTokenExpiresAt: string
  user: SessionUser
}

/** Clé alternative utilisée par certains flux de login (ex. LoginPage) */
const KEY_TOKEN_LEGACY = "token"

/**
 * Récupère le JWT d'accès pour les requêtes API.
 * Vérifie d'abord "accessToken" (session standard), puis "token" (fallback).
 */
export function getAccessToken(): string | null {
  return localStorage.getItem(KEY_ACCESS) ?? localStorage.getItem(KEY_TOKEN_LEGACY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(KEY_REFRESH)
}

export function getUser(): SessionUser | null {
  try {
    const raw = localStorage.getItem(KEY_USER)
    return raw ? (JSON.parse(raw) as SessionUser) : null
  } catch {
    return null
  }
}

/** Enregistre les tokens et l'utilisateur après login / register / refresh */
export function setSession(data: SessionTokens): void {
  if (data.accessToken) localStorage.setItem(KEY_ACCESS, data.accessToken)
  if (data.refreshToken) localStorage.setItem(KEY_REFRESH, data.refreshToken)
  if (data.user) localStorage.setItem(KEY_USER, JSON.stringify(data.user))
  if (data.accessTokenExpiresAt) localStorage.setItem(KEY_ACCESS_EXPIRES, data.accessTokenExpiresAt)
  if (data.refreshTokenExpiresAt) localStorage.setItem("refreshTokenExpiresAt", data.refreshTokenExpiresAt)
}

/** Déconnexion : supprime les tokens et l'utilisateur */
export function clearSession(): void {
  localStorage.removeItem(KEY_ACCESS)
  localStorage.removeItem(KEY_REFRESH)
  localStorage.removeItem(KEY_USER)
  localStorage.removeItem(KEY_ACCESS_EXPIRES)
  localStorage.removeItem("refreshTokenExpiresAt")
}

/** Vérifie si une session est présente (access token présent et non expiré) */
export function hasSession(): boolean {
  const token = getAccessToken()
  if (!token) return false

  // Vérifier si le token n'est pas expiré
  const expiresAt = localStorage.getItem(KEY_ACCESS_EXPIRES)
  if (expiresAt) {
    const expirationTime = new Date(expiresAt).getTime()
    const now = new Date().getTime()
    if (now >= expirationTime) {
      // Token expiré, nettoyer la session
      clearSession()
      return false
    }
  }

  // Si pas de refreshToken mais accessToken valide, autoriser l'accès
  // (solution temporaire en attendant correction backend)
  return true
}

/**
 * Déconnexion côté serveur (révocation de la session) puis nettoyage local.
 * Appelle POST /auth/logout avec Bearer ; en cas d'erreur (ex. 401), nettoie quand même le client.
 */
export async function logout(): Promise<void> {
  try {
    await authFetch("/auth/logout", { method: "POST" })
  } catch {
    // ignore network errors
  }
  clearSession()
}

/**
 * Appel API authentifié : envoie Bearer accessToken.
 * Si 401, tente un refresh (POST /auth/refresh) puis réessaie une fois.
 * Si le refresh échoue, clearSession() et la réponse reste 401.
 */
/** Déclenche un "session-activity" pour réinitialiser le timer d'inactivité (1h) */
function recordActivity(): void {
  try {
    window.dispatchEvent(new CustomEvent("session-activity"))
  } catch {
    // ignore
  }
}

/** Met à jour les informations de l'utilisateur dans la session */
export function updateSessionUser(user: Partial<SessionUser>): void {
  const currentUser = getUser()
  if (currentUser) {
    const updatedUser = { ...currentUser, ...user }
    localStorage.setItem(KEY_USER, JSON.stringify(updatedUser))
  }
}

/** Récupère le CSRF token depuis le backend */
async function getCsrfToken(): Promise<string> {
  const response = await fetch(`${API_URL}/auth/csrf-token`, {
    method: 'GET',
    credentials: 'include'
  });
  const data = await response.json().catch(() => ({}));
  const token = data?.csrfToken || response.headers.get('X-CSRF-Token');
  if (!token) throw new Error('CSRF token not found');
  return token;
}

export const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  recordActivity()
  // Si c'est un token Google temporaire, ne pas faire d'appels backend
  const accessToken = getAccessToken();
  if (accessToken?.startsWith('google_')) {
    console.warn(' Skipping backend API call for Google temp token');
    return new Response(JSON.stringify({ message: 'Offline mode - Google token' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const access = getAccessToken()
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  }
  if (access) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${access}`
  }

  // Ajouter le CSRF token pour les méthodes qui modifient les données
  const method = (options.method || 'GET').toUpperCase()
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
    try {
      const csrfToken = await getCsrfToken()
        ; (headers as Record<string, string>)["X-CSRF-Token"] = csrfToken
    } catch (error) {
      console.warn('Could not get CSRF token:', error)
    }
  }

  // Ensure the URL is absolute by prepending API_URL if it's a relative path
  const finalUrl = url.startsWith('http') ? url : `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;

  let res = await fetch(finalUrl, { ...options, headers, credentials: 'include' })

  // Si c'est une erreur 401 et qu'on a un token temporaire (Google), ne pas essayer de rafraîchir
  if (res.status === 401 && getRefreshToken() && !getAccessToken()?.startsWith('google_')) {
    try {
      const csrfToken = await getCsrfToken()
      const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ refreshToken: getRefreshToken() }),
      })
      const data = await refreshRes.json().catch(() => ({}))
      if (refreshRes.ok && data.accessToken) {
        setSession({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          accessTokenExpiresAt: data.accessTokenExpiresAt,
          refreshTokenExpiresAt: data.refreshTokenExpiresAt,
          user: data.user,
        })
        const newAccess = getAccessToken()
        if (newAccess) {
          (headers as Record<string, string>)["Authorization"] = `Bearer ${newAccess}`
          res = await fetch(url, { ...options, headers, credentials: 'include' })
        }
      } else {
        clearSession()
      }
    } catch (error) {
      console.error('Token refresh failed:', error)
      clearSession()
    }
  }

  return res
}
