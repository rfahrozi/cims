-- =============================================================================
-- Migration 0016 — Appeal Reading: Kolom Data Surat Penetapan (SEMA No. 2/2026)
-- =============================================================================
-- Menambahkan kolom yang diperlukan untuk men-generate Surat Penetapan resmi
-- sesuai Format Baku Lampiran SEMA No. 2 Tahun 2026 (berlaku 1 Agustus 2026).
--
-- Template yang didukung:
--   I.   Penetapan Pemberitahuan Sidang Pembacaan Putusan  [Pasal 298 ayat (1)]
--   II.  Penetapan Perubahan Tanggal Pembacaan Putusan     [Pasal 298 ayat (3)]
--   III.1 Paragraf Penutup — tanggal musyawarah = ucapan
--   III.2 Paragraf Penutup — tanggal musyawarah ≠ ucapan
-- =============================================================================

-- Tautan undangan persidangan elektronik (Link Zoom) — input manual fallback.
-- Diisi jika virtual_session_reference tidak tersedia atau belum dibuat.
ALTER TABLE appeal_decision_readings
  ADD COLUMN IF NOT EXISTS zoom_join_url text;

-- Password meeting Zoom (opsional, dimasukkan ke amar penetapan).
ALTER TABLE appeal_decision_readings
  ADD COLUMN IF NOT EXISTS zoom_password text;

-- Nama resmi Pengadilan Tinggi — untuk kop surat dan badan penetapan.
-- Contoh: "Pengadilan Tinggi Jakarta", "Pengadilan Tinggi Bandung".
ALTER TABLE appeal_decision_readings
  ADD COLUMN IF NOT EXISTS court_name text;

-- Nama Hakim Ketua Majelis — untuk blok tanda tangan dan paragraf penutup.
ALTER TABLE appeal_decision_readings
  ADD COLUMN IF NOT EXISTS hakim_ketua text;

-- Nama Hakim Anggota (array, biasanya 2 orang) — untuk paragraf penutup.
ALTER TABLE appeal_decision_readings
  ADD COLUMN IF NOT EXISTS hakim_anggota text[];

-- Nama Panitera Pengganti — untuk paragraf penutup.
ALTER TABLE appeal_decision_readings
  ADD COLUMN IF NOT EXISTS panitera_pengganti text;

-- Tanggal musyawarah Majelis — hanya untuk Template III.2 (berbeda dengan tanggal ucapan).
-- Format ISO 8601 (timestamptz) — nullable, kosong berarti sama dengan scheduled_at.
ALTER TABLE appeal_decision_readings
  ADD COLUMN IF NOT EXISTS deliberation_date timestamptz;

-- Kota tempat penetapan ditetapkan — untuk blok "Ditetapkan di ...".
-- Jika kosong, diambil dari nama pengadilan (court_name).
ALTER TABLE appeal_decision_readings
  ADD COLUMN IF NOT EXISTS penetapan_city text;

-- Nomor penetapan yang dihasilkan — disimpan setelah dokumen di-generate pertama kali,
-- agar nomor konsisten jika dokumen dicetak ulang.
-- Format bebas sesuai tata naskah dinas pengadilan masing-masing.
ALTER TABLE appeal_decision_readings
  ADD COLUMN IF NOT EXISTS penetapan_number text;

-- Nama Penuntut Umum (Jaksa) — untuk paragraf penutup (sesuai catatan kaki ¹¹ dan ¹²).
ALTER TABLE appeal_decision_readings
  ADD COLUMN IF NOT EXISTS penuntut_umum text;

COMMENT ON COLUMN appeal_decision_readings.zoom_join_url IS
  'Tautan undangan persidangan elektronik (Link Zoom). Fallback manual jika virtual_session_reference tidak ada.';
COMMENT ON COLUMN appeal_decision_readings.zoom_password IS
  'Password meeting Zoom — opsional, dimuat di amar penetapan jika diisi.';
COMMENT ON COLUMN appeal_decision_readings.court_name IS
  'Nama resmi Pengadilan Tinggi untuk kop surat. Contoh: Pengadilan Tinggi Jakarta.';
COMMENT ON COLUMN appeal_decision_readings.hakim_ketua IS
  'Nama Hakim Ketua Majelis untuk blok tanda tangan dan paragraf penutup.';
COMMENT ON COLUMN appeal_decision_readings.hakim_anggota IS
  'Array nama Hakim Anggota Majelis (biasanya 2 orang).';
COMMENT ON COLUMN appeal_decision_readings.panitera_pengganti IS
  'Nama Panitera Pengganti untuk paragraf penutup putusan.';
COMMENT ON COLUMN appeal_decision_readings.deliberation_date IS
  'Tanggal musyawarah Majelis — untuk Template III.2 jika berbeda dari tanggal pembacaan.';
COMMENT ON COLUMN appeal_decision_readings.penetapan_city IS
  'Kota penetapan untuk blok "Ditetapkan di ...". Default dari court_name jika kosong.';
COMMENT ON COLUMN appeal_decision_readings.penetapan_number IS
  'Nomor penetapan resmi — disimpan agar konsisten jika dokumen dicetak ulang.';
COMMENT ON COLUMN appeal_decision_readings.penuntut_umum IS
  'Nama Penuntut Umum (Jaksa) untuk paragraf penutup (catatan kaki ¹¹/¹² SEMA No.2/2026).';
