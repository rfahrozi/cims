import fs from 'fs';

const filePath = 'apps/api/src/modules/appeal-decision/penetapan-document.service.ts';
let content = fs.readFileSync(filePath, 'utf8');

const renderPerubahanTanggalOld =
  /private renderPerubahanTanggal\(data: RenderData\): string \{[\s\S]*?private renderParagrafPenutupSama/m;
const renderPerubahanTanggalNew = `private renderPerubahanTanggal(data: RenderData): string {
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
        ? \`secara elektronik\`
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
               atas nama Terdakwa/Para Terdakwa ...;</p>
            <p>2. Berkas Perkara Pengadilan Negeri ... Nomor Perkara ...;</p>
            <p>3. Penetapan Majelis Hakim tentang Pemberitahuan Sidang Pembacaan Putusan
               Tingkat Banding Perkara Nomor ... tanggal ...;</p>
          </td>
        </tr>
      </table>

      <p class="menimbang"><strong>Menimbang</strong>, bahwa berdasarkan Penetapan Majelis Hakim
      Pengadilan Tinggi \${this.esc(courtName)} Nomor ... Tanggal ..., sidang pembacaan putusan
      perkara pidana nomor ... atas nama Terdakwa/Para Terdakwa ... diselenggarakan pada hari ...
      tanggal ... pukul ... \${this.renderTimezone(reading.displayTimezone)}
      \${modeSebelumnya};</p>

      <p class="menimbang"><strong>Menimbang</strong>, bahwa berdasarkan alasan yang sah, oleh
      karenanya Majelis Hakim perlu menetapkan perubahan tanggal pembacaan putusan yang
      diselenggarakan \${reading.deliveryMode === 'ELEKTRONIK' ? 'secara elektronik' : 'secara langsung di ruang sidang'};</p>

      <p class="menimbang"><strong>Menimbang</strong>, bahwa berdasarkan alasan tersebut, Majelis
      Hakim memerintahkan Panitera Pengadilan Tinggi \${this.esc(courtName)} untuk memberitahukan
      perubahan tanggal sidang pembacaan putusan dengan mengirimkan penetapan ini sebagaimana
      amar penetapan;</p>

      <p class="memperhatikan"><strong>Memperhatikan</strong>, ketentuan Pasal 298 ayat (1), ayat (3),
      ayat (4), dan ayat (5) KUHAP serta peraturan perundang-undangan lain yang bersangkutan;</p>

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
    \`,
      'Penetapan Perubahan Tanggal Sidang Pembacaan Putusan (Pasal 298 ayat (3) KUHAP)'
    );
  }

  private renderParagrafPenutupSama`;

content = content.replace(renderPerubahanTanggalOld, renderPerubahanTanggalNew);
fs.writeFileSync(filePath, content);
