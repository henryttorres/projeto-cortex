export type User = { id: string; name: string; email: string; roles: string[] };
type Session = { user: User; csrfToken: string };
let csrfToken = '';
export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, { ...options, credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}), ...options.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(Array.isArray(body.message) ? body.message.join(' ') : body.message || 'Não foi possível concluir. Tente novamente.', response.status);
  return body;
}
export async function login(email: string, password: string) {
  const session = await api<Session>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  csrfToken = session.csrfToken;
  return session.user;
}
export async function restoreSession() {
  const session = await api<Session>('/auth/me');
  csrfToken = session.csrfToken;
  return session.user;
}
export async function endSession() {
  await api('/auth/logout', { method: 'POST' });
  csrfToken = '';
}
