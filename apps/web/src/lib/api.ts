const base = import.meta.env.VITE_API_URL ?? '/api/v1';
export const personas = [
  'substitute-clerk',
  'court-clerk',
  'judge',
  'prosecutor',
  'corrections',
  'it-operator',
  'security-officer',
  'auditor',
  'system-admin'
] as const;
export type Persona = (typeof personas)[number];
export function getPersona(): Persona {
  return (localStorage.getItem('cims_persona') as Persona | null) ?? 'substitute-clerk';
}
export function setPersona(persona: Persona): void {
  localStorage.setItem('cims_persona', persona);
  window.dispatchEvent(new Event('cims-persona-change'));
}
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('cims_token');
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json');
  headers.set('x-cims-dev-persona', getPersona());
  if (token) headers.set('authorization', `Bearer ${token}`);
  const response = await fetch(`${base}${path}`, { ...init, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(body?.error?.message ?? body?.message ?? `HTTP ${response.status}`);
  return body as T;
}
