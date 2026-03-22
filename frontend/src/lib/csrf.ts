// CSRF Token utilities
const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api"

export async function getCsrfToken(): Promise<string> {
  try {
    const response = await fetch(`${API_URL}/auth/csrf-token`, {
      method: "GET",
      credentials: "include",
    })
    
    if (!response.ok) {
      throw new Error("Failed to get CSRF token")
    }
    
    const data = await response.json()
    return data.csrfToken
  } catch (error) {
    console.error("CSRF token error:", error)
    return ""
  }
}
