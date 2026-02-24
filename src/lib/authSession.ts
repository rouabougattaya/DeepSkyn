/**
 * Session auth (sans JWT) : Access token courte durée, Refresh token longue durée.
 * Stockage côté client (localStorage) ; tokens opaques gérés côté serveur.
 */

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000"

const KEY_ACCESS = "accessToken"
const KEY_REFRESH = "refreshToken"
const KEY_USER = "user"
const KEY_ACCESS_EXPIRES = "accessTokenExpiresAt"

export interface SessionUser {
  id: string
  email: string
  firstName: string
  lastName: string
}

export interface SessionTokens {
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: string
  refreshTokenExpiresAt: string
  user: SessionUser
}

export function getAccessToken(): string | null {
  return localStorage.getItem(KEY_ACCESS)
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

/** Vérifie si une session est présente (access token présent) */
export function hasSession(): boolean {
  return !!getAccessToken()
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
export function updateSessionUser(user: Partial<SessionUser>): void {
  const current = getUser()
  if (!current) return
  const next = { ...current, ...user }
  localStorage.setItem(KEY_USER, JSON.stringify(next))
}
/** Déclenche un "session-activity" pour réinitialiser le timer d'inactivité (1h) */
function recordActivity(): void {
  try {
    window.dispatchEvent(new CustomEvent("session-activity"))
  } catch {
    // ignore
  }
}

export async function authFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  recordActivity()
  const url = path.startsWith("http") ? path : `${API_URL}${path}`
  const access = getAccessToken()

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  }
  if (access) {
    ;(headers as Record<string, string>)["Authorization"] = `Bearer ${access}`
  }

  // ✅ IMPORTANT: envoyer les cookies (CSRF, session, etc.)
  let res = await fetch(url, { ...options, headers, credentials: "include" })

  if (res.status === 401 && getRefreshToken()) {
    const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // ✅ IMPORTANT aussi
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
        ;(headers as Record<string, string>)["Authorization"] = `Bearer ${newAccess}`
        res = await fetch(url, { ...options, headers, credentials: "include" }) // ✅
      }
    } else {
      clearSession()
    }
  }

  return res
}