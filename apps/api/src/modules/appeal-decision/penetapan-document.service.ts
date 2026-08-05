import { Injectable } from '@nestjs/common';
import type { AppealDecisionReading } from '@cims/domain';

// ── Jenis dokumen yang dapat di-generate ────────────────────────────────────
export type PenetapanDocumentType =
  | 'PEMBERITAHUAN' // Template I  — Pasal 298 ayat (1) KUHAP
  | 'PERUBAHAN_TANGGAL' // Template II — Pasal 298 ayat (3) KUHAP
  | 'PARAGRAF_PENUTUP_SAMA' // Template III.1 — musyawarah = ucapan
  | 'PARAGRAF_PENUTUP_BERBEDA'; // Template III.2 — musyawarah ≠ ucapan

export const VALID_DOCUMENT_TYPES: PenetapanDocumentType[] = [
  'PEMBERITAHUAN',
  'PERUBAHAN_TANGGAL',
  'PARAGRAF_PENUTUP_SAMA',
  'PARAGRAF_PENUTUP_BERBEDA'
];

// ── Data render internal ─────────────────────────────────────────────────────
interface RenderData {
  reading: AppealDecisionReading & {
    zoomJoinUrl?: string;
    zoomPassword?: string;
    courtName?: string;
    penetapanCity?: string;
    penetapanNumber?: string;
    hakimKetua?: string;
    hakimAnggota?: string[];
    paniterapengganti?: string;
    penuntutUmum?: string;
    deliberationDate?: string;
  };
  resolvedJoinUrl: string;
  formattedDate: string; // "Senin, 28 Juli 2026"
  formattedTime: string; // "09.00 WIB"
  dayName: string; // "Senin"
  deliberationFormatted?: string; // Untuk Template III.2
}

/**
 * PenetapanDocumentService
 *
 * Service murni (tanpa dependency DB) yang menghasilkan dokumen HTML
 * berformat A4 sesuai Format Baku Lampiran SEMA No. 2 Tahun 2026.
 *
 * Output HTML siap cetak dari browser (Print → Save as PDF).
 * CSS @media print menyembunyikan chrome browser dan mengatur margin A4.
 */
@Injectable()
export class PenetapanDocumentService {
  /**
   * Entry point utama — pilih template sesuai documentType.
   * @param reading  Data appeal reading (termasuk kolom SEMA)
   * @param documentType  Jenis dokumen
   * @param providerSessionReference  Zoom Meeting ID dari virtual_sessions (opsional)
   */
  render(
    reading: RenderData['reading'],
    documentType: PenetapanDocumentType,
    providerSessionReference?: string
  ): string {
    const resolvedJoinUrl = this.resolveJoinUrl(reading, providerSessionReference);
    const tz = reading.displayTimezone ?? 'Asia/Jakarta';
    const formattedDate = this.formatDate(reading.scheduledAt, tz);
    const formattedTime = this.formatTime(reading.scheduledAt, tz);
    const dayName = this.getDayName(reading.scheduledAt, tz);

    const data: RenderData = {
      reading,
      resolvedJoinUrl,
      formattedDate,
      formattedTime,
      dayName,
      deliberationFormatted: reading.deliberationDate
        ? this.formatDate(reading.deliberationDate, tz)
        : undefined
    };

    switch (documentType) {
      case 'PEMBERITAHUAN':
        return this.renderPemberitahuan(data);
      case 'PERUBAHAN_TANGGAL':
        return this.renderPerubahanTanggal(data);
      case 'PARAGRAF_PENUTUP_SAMA':
        return this.renderParagrafPenutupSama(data);
      case 'PARAGRAF_PENUTUP_BERBEDA':
        return this.renderParagrafPenutupBerbeda(data);
    }
  }

  // ── Template I: Penetapan Pemberitahuan Sidang Pembacaan Putusan ────────────
  // Pasal 298 ayat (1) KUHAP — dikirim pertama kali ke Jaksa lalu Terdakwa

  private renderPemberitahuan(data: RenderData): string {
    const { reading, resolvedJoinUrl, formattedDate, formattedTime, dayName } = data;
    const courtName = reading.courtName ?? '...';
    const penetapanNumber = reading.penetapanNumber ?? '.../PID.../.../PT ...';
    const penetapanCity = reading.penetapanCity ?? this.extractCity(courtName);
    const hakimKetua = reading.hakimKetua ?? '...';
    const isElektronik = reading.deliveryMode === 'ELEKTRONIK' || reading.deliveryMode === 'HYBRID';
    const modePembacaan = this.renderModePembacaan(
      reading.deliveryMode,
      courtName,
      resolvedJoinUrl,
      reading.zoomPassword
    );
    const modeMenimbang = isElektronik
      ? `secara elektronik dengan alasan persidangan diselenggarakan secara elektronik sesuai ketentuan yang berlaku`
      : `langsung di ruang sidang Pengadilan Tinggi ${courtName}`;

    return this.wrapHtml(
      `
      <div class="penetapan-header">
        <p class="pid-mark">PID ...</p>
      </div>

      <h2 class="judul-penetapan">P E N E T A P A N</h2>
      <p class="nomor-penetapan">Nomor ${this.esc(penetapanNumber)}</p>
      <p class="demi-keadilan">DEMI KEADILAN BERDASARKAN KETUHANAN YANG MAHA ESA</p>

      <p>Majelis Hakim Pengadilan Tinggi ${this.esc(courtName)};</p>

      <table class="membaca-table">
        <tr>
          <td class="label-col">Membaca</td>
          <td class="colon-col">:</td>
          <td>
            <p>1. Penetapan Ketua Pengadilan Tinggi ${this.esc(courtName)} Nomor ...
               tanggal ... tentang Penunjukan Majelis Hakim untuk mengadili perkara
               atas nama Terdakwa ...;</p>
            <p>2. Berkas Perkara Pengadilan Negeri ... Nomor Perkara ...;</p>
          </td>
        </tr>
      </table>

      <p class="menimbang"><strong>Menimbang</strong>, bahwa Majelis Hakim telah memeriksa dengan
      cermat seluruh berkas perkara yang diterima dari Pengadilan Negeri .../Pengadilan
      Tindak Pidana Korupsi pada Pengadilan Negeri ... yang terdiri dari berita acara
      pemeriksaan dari Penyidik, berita acara pemeriksaan di sidang pengadilan negeri/pengadilan
      tindak pidana korupsi pada pengadilan negeri, beserta semua surat yang timbul di sidang
      yang berhubungan dengan perkara itu, dan putusan Pengadilan Negeri .../Pengadilan Tindak
      Pidana Korupsi pada Pengadilan Negeri ... yang dimohonkan banding;
      <sup>1</sup></p>

      <p class="menimbang"><strong>Menimbang</strong>, bahwa Majelis Hakim menyatakan pemeriksaan
      telah selesai dan ditutup sehingga agenda berikutnya merupakan pembacaan putusan yang
      diselenggarakan secara ${modeMenimbang};</p>

      <p class="menimbang"><strong>Menimbang</strong>, bahwa berdasarkan alasan tersebut, Majelis
      Hakim memerintahkan Panitera Pengadilan Tinggi ${this.esc(courtName)} untuk memberitahukan
      tanggal sidang pembacaan putusan dengan mengirimkan penetapan ini sebagaimana amar
      penetapan;</p>

      <p class="memperhatikan"><strong>Memperhatikan</strong>, ketentuan Pasal 298 ayat (1) dan ayat (4) KUHAP serta peraturan perundang-undangan lain yang bersangkutan;</p>

      <div class="amar">
        <p class="menetapkan">M E N E T A P K A N :</p>
        <ol>
          <li>
            <p>Menetapkan pembacaan putusan yang akan dilaksanakan pada hari
            <strong>${this.esc(dayName)}</strong> tanggal
            <strong>${this.esc(formattedDate)}</strong> pukul
            <strong>${this.esc(formattedTime)}</strong>
            ${modePembacaan};</p>
          </li>
          <li>
            <p>Memerintahkan Panitera Pengadilan Tinggi ${this.esc(courtName)}
            menyampaikan salinan penetapan ini kepada Penuntut Umum Pengadilan Negeri ...
            dan Terdakwa/Penasihat Hukum;</p>
          </li>
        </ol>
      </div>

      ${this.renderTtdBlock(penetapanCity, hakimKetua)}

      <div class="catatan-kaki">
        <p><sup>1</sup> Sesuaikan dengan alasan permohonan banding dan kontra memori banding (jika ada)</p>
      </div>
    `,
      'Penetapan Pemberitahuan Sidang Pembacaan Putusan (Pasal 298 ayat (1) KUHAP)'
    );
  }

  private renderPerubahanTanggal(data: RenderData): string {
    const { reading, resolvedJoinUrl, formattedDate, formattedTime, dayName } = data;
    const courtName = reading.courtName ?? '...';
    const penetapanNumber = reading.penetapanNumber ?? '.../PID.../.../PT ...';
    const penetapanCity = reading.penetapanCity ?? this.extractCity(courtName);
    const hakimKetua = reading.hakimKetua ?? '...';
    const modePembacaan = this.renderModePembacaan(
      reading.deliveryMode,
      courtName,
      resolvedJoinUrl,
      reading.zoomPassword
    );
    const modeSebelumnya =
      reading.deliveryMode === 'ELEKTRONIK'
        ? `secara elektronik`
        : `langsung di ruang sidang Pengadilan Tinggi ${courtName}`;

    return this.wrapHtml(
      `
      <div class="penetapan-header">
        <p class="pid-mark">PID ...</p>
      </div>

      <h2 class="judul-penetapan">P E N E T A P A N</h2>
      <p class="nomor-penetapan">Nomor ${this.esc(penetapanNumber)}</p>
      <p class="demi-keadilan">DEMI KEADILAN BERDASARKAN KETUHANAN YANG MAHA ESA</p>

      <p>Majelis Hakim Pengadilan Tinggi ${this.esc(courtName)};</p>

      <table class="membaca-table">
        <tr>
          <td class="label-col">Membaca</td>
          <td class="colon-col">:</td>
          <td>
            <p>1. Penetapan Ketua Pengadilan Tinggi ${this.esc(courtName)} Nomor ...
               tanggal ... tentang Penunjukan Majelis Hakim untuk mengadili perkara
               atas nama Terdakwa/Para Terdakwa ...;</p>
            <p>2. Berkas Perkara Pengadilan Negeri ... Nomor Perkara ...;</p>
            <p>3. Penetapan Majelis Hakim tentang Pemberitahuan Sidang Pembacaan Putusan
               Tingkat Banding Perkara Nomor ... tanggal ...;</p>
          </td>
        </tr>
      </table>

      <p class="menimbang"><strong>Menimbang</strong>, bahwa berdasarkan Penetapan Majelis Hakim
      Pengadilan Tinggi ${this.esc(courtName)} Nomor ... Tanggal ..., sidang pembacaan putusan
      perkara pidana nomor ... atas nama Terdakwa/Para Terdakwa ... diselenggarakan pada hari ...
      tanggal ... pukul ... ${this.renderTimezone(reading.displayTimezone)}
      ${modeSebelumnya};</p>

      <p class="menimbang"><strong>Menimbang</strong>, bahwa berdasarkan alasan yang sah, oleh
      karenanya Majelis Hakim perlu menetapkan perubahan tanggal pembacaan putusan yang
      diselenggarakan ${reading.deliveryMode === 'ELEKTRONIK' ? 'secara elektronik' : 'secara langsung di ruang sidang'};</p>

      <p class="menimbang"><strong>Menimbang</strong>, bahwa berdasarkan alasan tersebut, Majelis
      Hakim memerintahkan Panitera Pengadilan Tinggi ${this.esc(courtName)} untuk memberitahukan
      perubahan tanggal sidang pembacaan putusan dengan mengirimkan penetapan ini sebagaimana
      amar penetapan;</p>

      <p class="memperhatikan"><strong>Memperhatikan</strong>, ketentuan Pasal 298 ayat (1), ayat (3),
      ayat (4), dan ayat (5) KUHAP serta peraturan perundang-undangan lain yang bersangkutan;</p>

      <div class="amar">
        <p class="menetapkan">M E N E T A P K A N :</p>
        <ol>
          <li>
            <p>Menetapkan pembacaan putusan yang akan dilaksanakan pada hari
            <strong>${this.esc(dayName)}</strong> tanggal
            <strong>${this.esc(formattedDate)}</strong> pukul
            <strong>${this.esc(formattedTime)}</strong>
            ${modePembacaan};</p>
          </li>
          <li>
            <p>Memerintahkan Panitera Pengadilan Tinggi ${this.esc(courtName)}
            menyampaikan salinan penetapan ini kepada Penuntut Umum Pengadilan Negeri ...
            dan Terdakwa/Penasihat Hukum;</p>
          </li>
        </ol>
      </div>

      ${this.renderTtdBlock(penetapanCity, hakimKetua)}
    `,
      'Penetapan Perubahan Tanggal Sidang Pembacaan Putusan (Pasal 298 ayat (3) KUHAP)'
    );
  }

  private renderParagrafPenutupSama(data: RenderData): string {
    const { reading, formattedDate, dayName } = data;
    const courtName = reading.courtName ?? '...';
    const hakimKetua = reading.hakimKetua ?? '...';
    const hakimAnggota = reading.hakimAnggota ?? ['...', '...'];
    const paniterapengganti = reading.paniterapengganti ?? '...';
    const penuntutUmum = reading.penuntutUmum ?? '...';
    const modeHadir = reading.deliveryMode === 'LANGSUNG' ? 'langsung' : 'secara elektronik';

    return this.wrapHtml(
      `
      <div class="paragraf-container">
        <p class="pid-mark">PID ...</p>
        <div class="paragraf-penutup">
          <p>Demikianlah diputuskan dalam musyawarah Majelis Hakim Pengadilan Tinggi
          ${this.esc(courtName)}, pada hari <strong>${this.esc(dayName)}</strong>,
          tanggal <strong>${this.esc(formattedDate)}</strong>, oleh
          <strong>${this.esc(hakimKetua)}</strong>, sebagai Hakim Ketua,
          ${hakimAnggota.map((h) => `<strong>${this.esc(h)}</strong>`).join(' dan ')},
          masing-masing sebagai Hakim Anggota, dan putusan tersebut diucapkan dalam sidang
          terbuka untuk umum pada hari itu juga oleh Hakim Ketua dengan didampingi
          Hakim-Hakim Anggota tersebut, serta
          <strong>${this.esc(paniterapengganti)}</strong> Panitera Pengganti, dengan
          dihadiri/tidak dihadiri* oleh Terdakwa/Para Terdakwa dan/atau
          <strong>${this.esc(penuntutUmum)}</strong>
          <sup>1</sup> Penuntut Umum* secara langsung dan/atau secara elektronik* dan putusan
          tersebut telah dikirim melalui Sistem Informasi Pengadilan.</p>
        </div>

        ${this.renderTtdMajelis(hakimAnggota, hakimKetua, paniterapengganti)}

        <div class="catatan-kaki">
          <p>* : pilih salah satu sesuai kenyataan persidangan</p>
          <p><sup>1</sup> Sesuai dengan nama Penuntut Umum</p>
        </div>
      </div>
    `,
      'Paragraf Penutup Putusan PT — Tanggal Musyawarah dan Ucapan Sama'
    );
  }

  // ── Template III.2: Paragraf Penutup — Tanggal Musyawarah ≠ Ucapan ─────────

  private renderParagrafPenutupBerbeda(data: RenderData): string {
    const { reading, formattedDate, dayName, deliberationFormatted } = data;
    const courtName = reading.courtName ?? '...';
    const hakimKetua = reading.hakimKetua ?? '...';
    const hakimAnggota = reading.hakimAnggota ?? ['...', '...'];
    const paniterapengganti = reading.paniterapengganti ?? '...';
    const penuntutUmum = reading.penuntutUmum ?? '...';
    const deliberationDay = reading.deliberationDate
      ? this.getDayName(reading.deliberationDate, reading.displayTimezone ?? 'Asia/Jakarta')
      : '...';

    return this.wrapHtml(
      `
      <div class="paragraf-container">
        <p class="pid-mark">PID ...</p>
        <div class="paragraf-penutup">
          <p>Demikianlah diputuskan dalam musyawarah Majelis Hakim Pengadilan Tinggi
          ${this.esc(courtName)}, pada hari <strong>${this.esc(deliberationDay)}</strong>,
          tanggal <strong>${this.esc(deliberationFormatted ?? '...')}</strong>, oleh
          <strong>${this.esc(hakimKetua)}</strong>, sebagai Hakim Ketua,
          ${hakimAnggota.map((h) => `<strong>${this.esc(h)}</strong>`).join(' dan ')},
          masing-masing sebagai Hakim Anggota, dan putusan tersebut diucapkan dalam sidang
          terbuka untuk umum pada hari <strong>${this.esc(dayName)}</strong> tanggal
          <strong>${this.esc(formattedDate)}</strong> oleh Hakim Ketua dengan didampingi
          Hakim-Hakim Anggota tersebut, serta
          <strong>${this.esc(paniterapengganti)}</strong> Panitera Pengganti, dengan
          dihadiri/tidak dihadiri* oleh Terdakwa/Para Terdakwa dan/atau
          <strong>${this.esc(penuntutUmum)}</strong>
          <sup>1</sup> Penuntut Umum* secara langsung dan/atau secara elektronik* dan putusan
          tersebut telah dikirim melalui Sistem Informasi Pengadilan.</p>
        </div>

        ${this.renderTtdMajelis(hakimAnggota, hakimKetua, paniterapengganti)}

        <div class="catatan-kaki">
          <p>* : pilih salah satu sesuai kenyataan persidangan</p>
          <p><sup>1</sup> Sesuai dengan nama Penuntut Umum</p>
        </div>
      </div>
    `,
      'Paragraf Penutup Putusan PT — Tanggal Musyawarah dan Ucapan Berbeda'
    );
  }

  // ── Helper renderers ──────────────────────────────────────────────────────

  /**
   * Render klausa mode pembacaan di amar penetapan.
   * Jika ELEKTRONIK/HYBRID: tampilkan link Zoom dan password (jika ada).
   */
  private renderModePembacaan(
    deliveryMode: string,
    courtName: string,
    joinUrl: string,
    zoomPassword?: string
  ): string {
    if (deliveryMode === 'LANGSUNG') {
      return `secara langsung di ruang sidang Pengadilan Tinggi ${this.esc(courtName)}`;
    }
    const linkBlock = joinUrl.startsWith('http')
      ? `<br>&nbsp;&nbsp;&nbsp;&nbsp;<strong>Tautan:</strong>
         <a href="${this.esc(joinUrl)}" class="zoom-link">${this.esc(joinUrl)}</a>
         ${zoomPassword ? `<br>&nbsp;&nbsp;&nbsp;&nbsp;<strong>Password:</strong> <code>${this.esc(zoomPassword)}</code>` : ''}`
      : `<br>&nbsp;&nbsp;&nbsp;&nbsp;<em>${this.esc(joinUrl)}</em>`;

    if (deliveryMode === 'HYBRID') {
      return `secara langsung di ruang sidang Pengadilan Tinggi ${this.esc(courtName)}
              dan/atau secara elektronik${linkBlock}`;
    }
    // ELEKTRONIK
    return `secara elektronik${linkBlock}`;
  }

  private renderTimezone(tz?: string): string {
    if (!tz) return 'WIB';
    if (tz.includes('Asia/Makassar') || tz.includes('Asia/Ujung_Pandang')) return 'WITA';
    if (tz.includes('Asia/Jayapura')) return 'WIT';
    return 'WIB';
  }

  /** Blok tanda tangan Hakim Ketua untuk Template I dan II */
  private renderTtdBlock(city: string, hakimKetua: string): string {
    return `
      <div class="ttd-block">
        <p>Ditetapkan di ${this.esc(city)};</p>
        <p>Pada tanggal ${this.formatTodayDate()};</p>
        <br>
        <p>Hakim Ketua,</p>
        <div class="ttd-space"></div>
        <p class="ttd-dto">-DTO-</p>
        <p><strong>${this.esc(hakimKetua)}</strong></p>
      </div>
    `;
  }

  /** Blok tanda tangan Majelis + Panitera Pengganti untuk Template III */
  private renderTtdMajelis(
    hakimAnggota: string[],
    hakimKetua: string,
    paniterapengganti: string
  ): string {
    const anggotaNames = hakimAnggota.map((h) => `<p><strong>${this.esc(h)}</strong></p>`).join('');
    return `
      <div class="ttd-majelis">
        <div class="ttd-col">
          <p>Hakim-hakim Anggota,</p>
          <div class="ttd-space"></div>
          ${anggotaNames}
        </div>
        <div class="ttd-col">
          <p>Hakim Ketua,</p>
          <div class="ttd-space"></div>
          <p><strong>${this.esc(hakimKetua)}</strong></p>
        </div>
      </div>
      <div class="ttd-panitera">
        <p>Panitera Pengganti,</p>
        <div class="ttd-space"></div>
        <p><strong>${this.esc(paniterapengganti)}</strong></p>
      </div>
    `;
  }

  // ── Zoom URL resolver ─────────────────────────────────────────────────────

  /**
   * Resolve join URL Zoom dengan fallback bertingkat:
   * 1. Zoom Meeting ID dari virtual_sessions (provider_session_reference)
   * 2. zoom_join_url manual dari appeal_readings
   * 3. Placeholder teks
   */
  resolveJoinUrl(reading: RenderData['reading'], providerSessionReference?: string): string {
    if (providerSessionReference?.trim()) {
      return `https://zoom.us/j/${providerSessionReference.trim()}`;
    }
    if (reading.zoomJoinUrl?.trim()) {
      return reading.zoomJoinUrl.trim();
    }
    return '[Tautan akan disampaikan terpisah]';
  }

  // ── Date/Time formatters ──────────────────────────────────────────────────

  private formatDate(iso: string, timezone: string): string {
    try {
      return new Date(iso).toLocaleDateString('id-ID', {
        weekday: undefined,
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: timezone
      });
    } catch {
      return iso;
    }
  }

  private formatTime(iso: string, timezone: string): string {
    try {
      const timeStr = new Date(iso).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: timezone
      });
      const tzLabel = this.renderTimezone(timezone);
      return `${timeStr} ${tzLabel}`;
    } catch {
      return iso;
    }
  }

  private getDayName(iso: string, timezone: string): string {
    try {
      return new Date(iso).toLocaleDateString('id-ID', {
        weekday: 'long',
        timeZone: timezone
      });
    } catch {
      return '...';
    }
  }

  private formatTodayDate(): string {
    // Diisi saat dokumen di-generate — tanggal server saat ini
    return new Date().toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Jakarta'
    });
  }

  private extractCity(courtName: string): string {
    // "Pengadilan Tinggi Jakarta" → "Jakarta"
    const match = courtName.match(/Pengadilan\s+Tinggi\s+(.+)/i);
    return match?.[1]?.trim() ?? courtName;
  }

  // ── HTML escaping ─────────────────────────────────────────────────────────

  private esc(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── HTML wrapper dengan CSS A4 ────────────────────────────────────────────

  private wrapHtml(body: string, title: string): string {
    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${this.esc(title)}</title>
  <style>
    /* ── Base ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.8;
      color: #000;
      background: #f0f0f0;
      padding: 20px;
    }

    /* ── Page simulation ── */
    .page {
      background: #fff;
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 2.5cm 2.5cm 2cm 3cm;
      box-shadow: 0 2px 12px rgba(0,0,0,0.15);
    }

    /* ── Header CIMS badge (tidak dicetak) ── */
    .cims-badge {
      background: #0b2a4a;
      color: #bfdbfe;
      font-family: -apple-system, sans-serif;
      font-size: 10px;
      padding: 6px 14px;
      margin-bottom: 12px;
      border-radius: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .cims-badge strong { color: #fff; }

    /* ── Struktur penetapan ── */
    .pid-mark { text-align: right; margin-bottom: 8px; }
    .judul-penetapan {
      text-align: center;
      font-size: 14pt;
      letter-spacing: 6px;
      margin: 12px 0 4px;
    }
    .nomor-penetapan { text-align: center; margin-bottom: 8px; }
    .demi-keadilan { text-align: center; font-weight: bold; margin-bottom: 16px; }

    /* ── Tabel membaca ── */
    .membaca-table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    .membaca-table td { vertical-align: top; padding: 2px 4px; }
    .label-col { width: 90px; white-space: nowrap; }
    .colon-col { width: 16px; }

    /* ── Paragraf Menimbang / Memperhatikan ── */
    .menimbang, .memperhatikan { margin: 10px 0; text-align: justify; }

    /* ── Amar ── */
    .amar { margin: 16px 0; }
    .menetapkan {
      text-align: center;
      font-weight: bold;
      font-size: 13pt;
      letter-spacing: 3px;
      margin: 12px 0;
    }
    .amar ol { padding-left: 20px; }
    .amar ol li { margin: 8px 0; text-align: justify; }

    /* ── Link Zoom ── */
    .zoom-link {
      color: #1a56db;
      font-weight: bold;
      word-break: break-all;
    }

    /* ── Blok tanda tangan Hakim Ketua ── */
    .ttd-block { margin-top: 32px; text-align: right; }
    .ttd-block p { margin: 2px 0; }
    .ttd-space { height: 60px; }
    .ttd-dto { font-weight: bold; }

    /* ── Blok tanda tangan Majelis (Template III) ── */
    .ttd-majelis {
      display: flex;
      justify-content: space-between;
      margin-top: 32px;
    }
    .ttd-col { width: 45%; }
    .ttd-panitera { margin-top: 24px; }

    /* ── Paragraf penutup ── */
    .paragraf-container { }
    .paragraf-penutup { text-align: justify; margin: 16px 0; }

    /* ── Catatan kaki ── */
    .catatan-kaki {
      margin-top: 24px;
      border-top: 1px solid #ccc;
      padding-top: 8px;
      font-size: 10pt;
    }
    .catatan-kaki p { margin: 2px 0; }

    /* ── Print overrides ── */
    @media print {
      body { background: none; padding: 0; }
      .page {
        box-shadow: none;
        padding: 2.5cm 2.5cm 2cm 3cm;
        width: 100%;
        min-height: 0;
      }
      .cims-badge { display: none !important; }
      .zoom-link { color: #000; text-decoration: underline; }

      @page {
        size: A4;
        margin: 0;
      }
    }
  </style>
</head>
<body>
  <div class="cims-badge">
    <span>CIMS — Court Information Management System</span>
    <strong>DOKUMEN RESMI — SESUAI FORMAT BAKU SEMA NO. 2 TAHUN 2026</strong>
  </div>
  <div class="page">
    ${body}
  </div>
  <script>
    // Trigger print dialog otomatis ketika dibuka di tab baru
    if (window.opener || window.name === '_blank') {
      window.addEventListener('load', function() {
        setTimeout(function() { window.print(); }, 300);
      });
    }
  </script>
</body>
</html>`;
  }
}
