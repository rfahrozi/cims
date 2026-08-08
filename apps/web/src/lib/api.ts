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
  if (token) headers.set('authorization', `Bearer ${token}`);
  const response = await fetch(`${base}${path}`, { ...init, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(body?.error?.message ?? body?.message ?? `HTTP ${response.status}`);
  return body as T;
}

/**
 * Upload file sebagai raw binary ke API.
 * Berbeda dari api() yang selalu hardcode Content-Type: application/json,
 * fungsi ini memperbolehkan Content-Type binary (PDF, JPEG, PNG).
 *
 * Digunakan untuk upload Surat Penetapan bertanda tangan ke CIMS.
 *
 * @param path    Path API relatif, misal '/appeal-decisions/notice-steps/:id/document'
 * @param file    File yang dipilih user dari <input type="file">
 * @param extraHeaders  Header tambahan, misal { 'x-file-name': file.name }
 */
export async function apiUploadFile<T>(
  path: string,
  file: File,
  extraHeaders?: Record<string, string>
): Promise<T> {
  const token = localStorage.getItem('cims_token');
  const headers = new Headers();
  // Content-Type diambil dari file — TIDAK di-override agar PDF terkirim benar
  headers.set('content-type', file.type || 'application/octet-stream');
  headers.set('x-file-name', file.name);
  if (token) headers.set('authorization', `Bearer ${token}`);
  if (extraHeaders) {
    for (const [k, v] of Object.entries(extraHeaders)) headers.set(k, v);
  }
  const arrayBuffer = await file.arrayBuffer();
  const response = await fetch(`${base}${path}`, {
    method: 'PUT',
    headers,
    body: arrayBuffer
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(body?.error?.message ?? body?.message ?? `HTTP ${response.status}`);
  return body as T;
}

/** URL lengkap untuk dokumen (digunakan window.open) */
export function documentUrl(path: string): string {
  return `${base}${path}`;
}
