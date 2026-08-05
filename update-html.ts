import fs from 'fs';

const filePath = 'apps/api/src/modules/appeal-decision/penetapan-document.service.ts';
let content = fs.readFileSync(filePath, 'utf8');

// The file looks quite similar to the standard document format, but checking carefully...
// Need to make sure the texts are exactly as in SEMA No. 2/2026.
// Let's replace the render functions with exact matches

const renderPemberitahuanOld =
  /private renderPemberitahuan\(data: RenderData\): string \{[\s\S]*?private renderPerubahanTanggal/m;
const renderPemberitahuanNew = `private renderPemberitahuan(data: RenderData): string {
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
      ? \`secara elektronik dengan alasan persidangan diselenggarakan secara elektronik sesuai ketentuan yang berlaku\`
      : \`langsung di ruang sidang Pengadilan Tinggi \${courtName}\`;

    return this.wrapHtml(
      \`
      <div class="penetapan-header">
        <p class="pid-mark">PID ...</p>
      </div>

      <h2 class="judul-penetapan">P E N E T A P A N</h2>
      <p class="nomor-penetapan">Nomor \${this.esc(penetapanNumber)}</p>
      <p class="demi-keadilan">DEMI KEADILAN BERDASARKAN KETUHANAN YANG MAHA ESA</p>

      <p>Majelis Hakim Pengadilan Tinggi \${this.esc(courtName)};</p>

      <table class="membaca-table">
        <tr>
          <td class="label-col">Membaca</td>
          <td class="colon-col">:</td>
          <td>
            <p>1. Penetapan Ketua Pengadilan Tinggi \${this.esc(courtName)} Nomor ...
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
      diselenggarakan secara \${modeMenimbang};</p>

      <p class="menimbang"><strong>Menimbang</strong>, bahwa berdasarkan alasan tersebut, Majelis
      Hakim memerintahkan Panitera Pengadilan Tinggi \${this.esc(courtName)} untuk memberitahukan
      tanggal sidang pembacaan putusan dengan mengirimkan penetapan ini sebagaimana amar
      penetapan;</p>

      <p class="memperhatikan"><strong>Memperhatikan</strong>, ketentuan Pasal 298 ayat (1) dan ayat (4) KUHAP serta peraturan perundang-undangan lain yang bersangkutan;</p>

      <div class="amar">
        <p class="menetapkan">M E N E T A P K A N :</p>
        <ol>
          <li>
            <p>Menetapkan pembacaan putusan yang akan dilaksanakan pada hari
            <strong>\${this.esc(dayName)}</strong> tanggal
            <strong>\${this.esc(formattedDate)}</strong> pukul
            <strong>\${this.esc(formattedTime)}</strong>
            \${modePembacaan};</p>
          </li>
          <li>
            <p>Memerintahkan Panitera Pengadilan Tinggi \${this.esc(courtName)}
            menyampaikan salinan penetapan ini kepada Penuntut Umum Pengadilan Negeri ...
            dan Terdakwa/Penasihat Hukum;</p>
          </li>
        </ol>
      </div>

      \${this.renderTtdHakim(penetapanCity, formattedDate, hakimKetua)}

      <div class="catatan-kaki">
        <p><sup>1</sup> Sesuaikan dengan alasan permohonan banding dan kontra memori banding (jika ada)</p>
      </div>
    \`,
      'Penetapan Pemberitahuan Sidang Pembacaan Putusan (Pasal 298 ayat (1) KUHAP)'
    );
  }

  private renderPerubahanTanggal`;

content = content.replace(renderPemberitahuanOld, renderPemberitahuanNew);

fs.writeFileSync(filePath, content);
