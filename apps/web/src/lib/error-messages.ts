/**
 * Peta error code domain → pesan Bahasa Indonesia yang human-readable.
 * Digunakan oleh errorMessage() untuk mengganti kode teknis dengan pesan bermakna.
 * SOP/CIMS/PPE/001/2026 — semua pesan harus informatif dan tidak jargon teknis.
 */
const ERROR_MESSAGES: Record<string, string> = {
  // ── Gate & workflow ──────────────────────────────────────────────────────
  DETERMINATION_REQUIRED:
    'Penetapan hakim diperlukan sebelum melanjutkan. Minta Hakim untuk mengeluarkan penetapan persidangan elektronik.',
  SCHEDULE_REQUIRED: 'Jadwal sidang harus disetujui terlebih dahulu sebelum melanjutkan.',
  NOTICE_ACK_REQUIRED:
    'Semua pemberitahuan resmi harus dikonfirmasi (acknowledged) oleh penerima sebelum melanjutkan.',
  READINESS_REQUIRED:
    'Semua instansi (Pengadilan, Kejaksaan, Pemasyarakatan) harus menyatakan kesiapan sebelum ruang virtual dapat dibuat.',
  HEARING_DATA_NOT_ACTIVE:
    'Data persidangan belum diaktifkan. Panitera perlu mengaktifkan data perkara terlebih dahulu.',
  PROVIDER_UNAVAILABLE:
    'Layanan video konferensi sedang tidak tersedia. Hubungi Tim TI untuk pemulihan.',

  // ── Auth & akses ─────────────────────────────────────────────────────────
  FORBIDDEN:
    'Aksi ini tidak diizinkan untuk peran Anda saat ini. Pastikan persona/peran yang aktif sudah sesuai.',
  UNAUTHORIZED: 'Sesi Anda telah habis. Silakan masuk kembali.',

  // ── Maker-checker ────────────────────────────────────────────────────────
  MAKER_CHECKER_REQUIRED:
    'Pengguna yang membuat data tidak boleh mengaktifkan data yang sama. Gunakan akun panitera yang berbeda.',
  LEGAL_HOLD_MAKER_CHECKER_REQUIRED:
    'Pengguna yang membuat legal hold tidak dapat melepasnya sendiri. Diperlukan persetujuan pengguna lain.',
  ACCESS_REVIEW_SELF_APPROVAL_FORBIDDEN:
    'Pengguna tidak dapat menyetujui atau mencabut aksesnya sendiri.',
  DELEGATION_SELF_FORBIDDEN: 'Tidak diperbolehkan mendelegasikan kewenangan kepada diri sendiri.',

  // ── Concurrency ──────────────────────────────────────────────────────────
  OPTIMISTIC_CONCURRENCY_CONFLICT:
    'Data telah diubah oleh pengguna lain. Refresh halaman dan coba kembali.',

  // ── Jadwal ───────────────────────────────────────────────────────────────
  CONFLICT_UNRESOLVED:
    'Terdapat konflik jadwal yang belum diselesaikan. Ubah waktu atau resource sebelum menyetujui jadwal.',
  INVALID_HEARING_TRANSITION: 'Aksi tidak dapat dilakukan pada status sidang saat ini.',

  // ── Peserta & sesi ───────────────────────────────────────────────────────
  INVALID_PARTICIPANT_TRANSITION: 'Perubahan status peserta tidak diizinkan dari status saat ini.',
  JOIN_TOKEN_EXPIRED:
    'Tautan akses sidang telah kedaluwarsa. Minta Panitera untuk menerbitkan tautan baru.',
  JOIN_TOKEN_REVOKED: 'Tautan akses sidang telah dicabut. Hubungi Panitera.',
  JOIN_TOKEN_INVALID: 'Tautan akses sidang tidak valid.',
  JOIN_TOKEN_CONSUMED: 'Tautan akses sidang ini sudah pernah digunakan.',
  CONSULTATION_ALREADY_ACTIVE:
    'Sesi konsultasi privat sedang berlangsung. Akhiri sesi yang aktif terlebih dahulu.',
  CONSULTATION_PARTICIPANTS_REQUIRED:
    'Konsultasi privat memerlukan kehadiran terdakwa dan advokat.',

  // ── Insiden ──────────────────────────────────────────────────────────────
  INVALID_INCIDENT_TRANSITION: 'Status insiden tidak dapat diubah dengan aksi tersebut.',
  INVALID_INCIDENT_TIME: 'Waktu kejadian insiden tidak valid. Periksa format tanggal dan waktu.',

  // ── Putusan banding ──────────────────────────────────────────────────────
  APPEAL_READING_NOT_FOUND: 'Data pembacaan putusan banding tidak ditemukan.',
  APPEAL_READING_NOT_SCHEDULED:
    'Hanya pembacaan dengan status SCHEDULED yang dapat dijadwalkan ulang.',
  APPEAL_EXCERPT_ALREADY_PUBLISHED: 'Petikan putusan sudah pernah diunggah untuk pembacaan ini.',
  APPEAL_ALREADY_TRANSMITTED: 'Berkas sudah pernah dikirim ke pengadilan tingkat pertama.',
  APPEAL_NOT_READ_YET:
    'Berkas hanya dapat dikirim setelah pembacaan putusan selesai (status READ).',

  // ── Mutasi tahanan ───────────────────────────────────────────────────────
  CUSTODY_TRANSFER_NOT_FOUND: 'Data mutasi tahanan tidak ditemukan.',
  CUSTODY_NOTIF_NOT_FOUND: 'Notifikasi mutasi tidak ditemukan.',

  // ── Liaison ──────────────────────────────────────────────────────────────
  LIAISON_NOT_FOUND: 'Data pejabat penghubung tidak ditemukan.',
  DELEGATION_NOT_FOUND: 'Data delegasi tidak ditemukan.',
  ESCALATION_NOT_FOUND: 'Data eskalasi tidak ditemukan.',

  // ── Data & validasi ──────────────────────────────────────────────────────
  VALIDATION_ERROR:
    'Data yang dimasukkan tidak valid. Periksa kembali semua field yang diperlukan.',
  HEARING_NOT_FOUND: 'Data persidangan tidak ditemukan. Pastikan perkara yang dipilih sudah benar.',
  ORGANIZATION_NOT_FOUND: 'Data instansi tidak ditemukan.',
  VERIFICATION_REQUIRED:
    'Pemasyarakatan wajib melengkapi verifikasi identitas dan inspeksi ruangan sebelum menyatakan kesiapan.',

  // ── Governance ───────────────────────────────────────────────────────────
  INVALID_CLOSED_AT: 'Tanggal penutupan perkara tidak valid.',
  ACCESS_REVIEW_SCOPE_REQUIRED: 'Cakupan tinjauan akses harus mencakup hearing atau organisasi.'
};

/**
 * Konversi error (dari fetch/API/domain) menjadi pesan yang ramah pengguna.
 *
 * Prioritas:
 * 1. Kode domain yang ada di peta ERROR_MESSAGES
 * 2. Pesan HTTP standar yang sudah cukup jelas
 * 3. Pesan original (fallback)
 */
export function errorMessage(error: unknown): string {
  if (!error) return 'Terjadi kesalahan yang tidak diketahui.';

  const raw = error instanceof Error ? error.message : String(error);

  // Cari error code di dalam pesan (format: "SOME_CODE: ...")
  for (const [code, friendly] of Object.entries(ERROR_MESSAGES)) {
    if (raw.includes(code)) return friendly;
  }

  // HTTP status yang umum
  if (raw.includes('HTTP 401')) return ERROR_MESSAGES.UNAUTHORIZED;
  if (raw.includes('HTTP 403')) return ERROR_MESSAGES.FORBIDDEN;
  if (raw.includes('HTTP 404')) return 'Data tidak ditemukan.';
  if (raw.includes('HTTP 409')) return 'Terjadi konflik data. Refresh halaman dan coba kembali.';
  if (raw.includes('HTTP 422'))
    return 'Data yang dikirim tidak dapat diproses. Periksa kembali isian form.';
  if (raw.includes('HTTP 429'))
    return 'Terlalu banyak permintaan. Tunggu beberapa saat lalu coba kembali.';
  if (raw.includes('HTTP 500') || raw.includes('HTTP 502') || raw.includes('HTTP 503'))
    return 'Server sedang mengalami gangguan. Hubungi Tim TI jika masalah berlanjut.';

  // Koneksi
  if (
    raw.includes('Failed to fetch') ||
    raw.includes('NetworkError') ||
    raw.includes('ERR_NETWORK')
  )
    return 'Koneksi internet terputus. Periksa jaringan Anda dan coba kembali.';

  // Fallback: tampilkan pesan asli tapi bersih
  return raw.length > 200 ? raw.slice(0, 200) + '…' : raw;
}
