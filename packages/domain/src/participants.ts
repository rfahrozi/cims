
import { DomainError } from './errors.js';

export type ParticipantRole =
  | 'JUDGE'
  | 'COURT_CLERK'
  | 'PROSECUTOR'
  | 'DEFENDANT'
  | 'ADVOCATE'
  | 'WITNESS'
  | 'EXPERT'
  | 'INTERPRETER'
  | 'CORRECTIONS_OFFICER'
  | 'IT_OPERATOR';

export type ParticipantState =
  | 'REGISTERED'
  | 'TOKEN_ISSUED'
  | 'WAITING'
  | 'ADMITTED'
  | 'LEFT'
  | 'REMOVED'
  | 'REVOKED';

export interface ParticipantAccessTokenState {
  id: string;
  participantId: string;
  hearingId: string;
  tokenHash: string;
  expiresAt: string;
  consumedAt?: string;
  revokedAt?: string;
}

export type ParticipantAction = 'ISSUE_TOKEN' | 'ENTER_WAITING' | 'ADMIT' | 'LEAVE' | 'REMOVE' | 'REVOKE';

export function transitionParticipant(current: ParticipantState, action: ParticipantAction): ParticipantState {
  const transitions: Record<ParticipantState, Partial<Record<ParticipantAction, ParticipantState>>> = {
    REGISTERED: { ISSUE_TOKEN: 'TOKEN_ISSUED', REVOKE: 'REVOKED' },
    TOKEN_ISSUED: { ENTER_WAITING: 'WAITING', REVOKE: 'REVOKED' },
    WAITING: { ADMIT: 'ADMITTED', REMOVE: 'REMOVED', REVOKE: 'REVOKED' },
    ADMITTED: { LEAVE: 'LEFT', REMOVE: 'REMOVED', REVOKE: 'REVOKED' },
    LEFT: { ISSUE_TOKEN: 'TOKEN_ISSUED', REVOKE: 'REVOKED' },
    REMOVED: { ISSUE_TOKEN: 'TOKEN_ISSUED', REVOKE: 'REVOKED' },
    REVOKED: {},
  };
  const next = transitions[current][action];
  if (!next) {
    throw new DomainError('INVALID_PARTICIPANT_TRANSITION', `Participant cannot perform ${action} from ${current}.`, 409, { current, action });
  }
  return next;
}

export function assertJoinTokenUsable(
  token: ParticipantAccessTokenState,
  presentedHash: string,
  now = new Date(),
): void {
  if (token.revokedAt) throw new DomainError('JOIN_TOKEN_REVOKED', 'The join token has been revoked.', 410);
  if (token.consumedAt) throw new DomainError('JOIN_TOKEN_CONSUMED', 'The join token has already been consumed.', 410);
  if (Date.parse(token.expiresAt) <= now.getTime()) throw new DomainError('JOIN_TOKEN_EXPIRED', 'The join token has expired.', 410);
  if (token.tokenHash !== presentedHash) throw new DomainError('JOIN_TOKEN_INVALID', 'The join token is invalid.', 401);
}

export function assertConsultationParticipants(roles: readonly ParticipantRole[]): void {
  const hasDefendant = roles.includes('DEFENDANT');
  const hasAdvocate = roles.includes('ADVOCATE');
  if (!hasDefendant || !hasAdvocate) {
    throw new DomainError('CONSULTATION_PARTICIPANTS_REQUIRED', 'Private consultation requires a defendant and an advocate.', 409, { roles });
  }
}

/**
 * H-12: SOP 10.8 Advocate Location Enforcement.
 * Advokat harus berada di lokasi yang sama dengan terdakwa,
 * KECUALI ada penetapan hakim secara spesifik yang mengizinkan pemisahan lokasi.
 */
export function assertAdvocateLocation(
  advocateLocationType: string,
  defendantLocationType: string,
  determinationReference?: string,
): void {
  if (advocateLocationType !== defendantLocationType) {
    if (!determinationReference || determinationReference.trim().length < 3) {
      throw new DomainError(
        'ADVOCATE_LOCATION_DETERMINATION_REQUIRED',
        'Penempatan advokat di lokasi yang berbeda dengan terdakwa wajib memiliki dasar penetapan hakim (SOP 10.8).',
        409,
      );
    }
  }
}

/**
 * Tingkat perlindungan identitas peserta.
 * SOP 10.9: saksi rentan, anak, korban kekerasan mendapat perlindungan identitas.
 * Berlaku untuk semua ParticipantRole, bukan hanya DEFENDANT.
 */
export type ProtectionLevel = 'NONE' | 'ALIAS_ONLY' | 'HIDDEN' | 'FULL_PROTECTION';

/**
 * Peran yang secara default mendapat perlindungan identitas berdasarkan SOP.
 * WITNESS, EXPERT, INTERPRETER rentan — default ALIAS_ONLY jika protectedIdentity=true.
 */
const VULNERABLE_ROLES: readonly ParticipantRole[] = ['WITNESS', 'EXPERT', 'INTERPRETER'];

/**
 * Kembalikan nama tampilan yang aman berdasarkan:
 * - protectedIdentity: apakah identitas perlu dilindungi
 * - role: peran peserta (witness/expert/interpreter otomatis dilindungi jika protectedIdentity=true)
 * - viewerCanSeeProtectedIdentity: apakah viewer memiliki izin melihat identitas asli
 * - alias: nama pengganti jika identitas disembunyikan
 *
 * H-06 SOP 10.9: perlindungan identitas berlaku untuk semua role, bukan hanya DEFENDANT.
 */
export function publicParticipantName(input: {
  displayName: string;
  protectedIdentity: boolean;
  role?: ParticipantRole;
  alias?: string;
  viewerCanSeeProtectedIdentity: boolean;
}): string {
  if (!input.protectedIdentity) return input.displayName;
  if (input.viewerCanSeeProtectedIdentity) return input.displayName;

  // Alias khusus jika tersedia
  if (input.alias?.trim()) return input.alias.trim();

  // Fallback berdasarkan peran
  if (input.role && VULNERABLE_ROLES.includes(input.role)) return 'Peserta Dilindungi';
  return 'Peserta Dilindungi';
}

/**
 * Tentukan protection level yang direkomendasikan berdasarkan role dan konteks.
 * Digunakan sebagai panduan — keputusan akhir tetap pada hakim.
 */
export function recommendedProtectionLevel(role: ParticipantRole, isMinor = false, isViolenceVictim = false): ProtectionLevel {
  if (isMinor || isViolenceVictim) return 'FULL_PROTECTION';
  if (VULNERABLE_ROLES.includes(role)) return 'ALIAS_ONLY';
  return 'NONE';
}
