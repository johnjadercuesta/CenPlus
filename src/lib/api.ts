/**
 * Shared API helpers for client-side authentication and fetch.
 * Centralizes the token/header logic that was repeated across components.
 */

export function getToken(): string | null {
  return localStorage.getItem("token");
}

export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function authHeadersWithJson(): Record<string, string> {
  return { ...authHeaders(), "Content-Type": "application/json" };
}
