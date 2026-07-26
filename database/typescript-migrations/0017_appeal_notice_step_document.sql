-- =============================================================================
-- Migration 0017 — Appeal Notice Step: Kolom Dokumen Penetapan Bertanda Tangan
-- =============================================================================
-- Memungkinkan Panitera mengupload PDF Surat Penetapan yang telah ditandatangani
-- dan dicap ke CIMS, sehingga Kejaksaan dan pihak terkait bisa mengaksesnya
-- langsung dari sistem tanpa perlu pengiriman manual via email/WhatsApp.
--
-- Alur: generate HTML → cetak → tanda tangan + cap → scan PDF → upload ke CIMS
--       Kejaksaan: login → Tab Pemberitahuan → "Lihat Dokumen" → PDF terbuka
--
-- Storage: disimpan via EvidenceStorageGateway (LOCAL/S3/HTTP sesuai konfigurasi)
-- Keamanan: SHA-256 hash + audit trail HMAC-chained per upload & download
-- =============================================================================

-- Object key di storage (LOCAL: path relatif, S3: key, HTTP: URL path)
ALTER TABLE appeal_notice_steps
  ADD COLUMN IF NOT EXISTS document_storage_key text;

-- SHA-256 hex digest dari konten file — untuk verifikasi integritas
ALTER TABLE appeal_notice_steps
  ADD COLUMN IF NOT EXISTS document_hash text;

-- Nama file asli saat diupload (misal: "penetapan-pemberitahuan.pdf")
ALTER TABLE appeal_notice_steps
  ADD COLUMN IF NOT EXISTS document_filename text;

-- Ukuran file dalam bytes
ALTER TABLE appeal_notice_steps
  ADD COLUMN IF NOT EXISTS document_size_bytes bigint;

-- MIME type file (whitelist: application/pdf, image/jpeg, image/png)
ALTER TABLE appeal_notice_steps
  ADD COLUMN IF NOT EXISTS document_content_type text;

-- Waktu upload dokumen
ALTER TABLE appeal_notice_steps
  ADD COLUMN IF NOT EXISTS document_uploaded_at timestamptz;

-- User ID Panitera yang mengupload dokumen (audit)
ALTER TABLE appeal_notice_steps
  ADD COLUMN IF NOT EXISTS document_uploaded_by text;

-- CHECK constraint: content type harus dalam whitelist jika diisi
ALTER TABLE appeal_notice_steps
  ADD CONSTRAINT chk_notice_step_doc_content_type CHECK (
    document_content_type IS NULL
    OR document_content_type IN ('application/pdf', 'image/jpeg', 'image/png')
  );

-- CHECK constraint: kolom dokumen harus konsisten (semua ada atau semua null)
ALTER TABLE appeal_notice_steps
  ADD CONSTRAINT chk_notice_step_doc_consistency CHECK (
    (document_storage_key IS NULL) = (document_hash IS NULL)
    AND (document_storage_key IS NULL) = (document_filename IS NULL)
    AND (document_storage_key IS NULL) = (document_uploaded_at IS NULL)
    AND (document_storage_key IS NULL) = (document_uploaded_by IS NULL)
  );

COMMENT ON COLUMN appeal_notice_steps.document_storage_key IS
  'Object key di evidence storage — diisi setelah Panitera upload PDF bertanda tangan.';
COMMENT ON COLUMN appeal_notice_steps.document_hash IS
  'SHA-256 hex dari konten file untuk verifikasi integritas dokumen.';
COMMENT ON COLUMN appeal_notice_steps.document_filename IS
  'Nama file asli saat diupload (misal: penetapan-pemberitahuan.pdf).';
COMMENT ON COLUMN appeal_notice_steps.document_size_bytes IS
  'Ukuran file dalam bytes — ditampilkan di UI, max 10MB.';
COMMENT ON COLUMN appeal_notice_steps.document_content_type IS
  'MIME type: application/pdf | image/jpeg | image/png.';
COMMENT ON COLUMN appeal_notice_steps.document_uploaded_at IS
  'Timestamp upload dokumen ke CIMS.';
COMMENT ON COLUMN appeal_notice_steps.document_uploaded_by IS
  'User ID Panitera yang mengupload — untuk audit trail.';
