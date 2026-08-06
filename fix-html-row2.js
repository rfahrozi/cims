const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('./docs/sop-format-siappakai.html', 'utf8');
const $ = cheerio.load(html);

// Row 2 is index 1 of the trs slice(2)
const trs = $('.process tr').slice(2);
const row2Tds = trs.eq(1).find('.flow.center');

// Right now, row 2 flows: Hakim -> Panitera -> (Sistem CIMS is empty)
// We need to flow: Hakim -> (passing Panitera) -> Sistem CIMS -> Panitera

// Hakim SVG (Col 2)
// Sends line right
const hakimSvg = `<svg class="flowSvg" viewBox="0 0 104 54">
    <line x1="104" y1="0" x2="52" y2="0" stroke="#111" stroke-width="1.5"></line>
    <line x1="52" y1="0" x2="52" y2="14" stroke="#111" stroke-width="1.5"></line>
    <polygon points="52,14 48,7 56,7" fill="#111"></polygon>
    <rect x="22" y="14" width="60" height="26" fill="none" stroke="#111" stroke-width="1.7"></rect>
    <line x1="82" y1="27" x2="104" y2="27" stroke="#111" stroke-width="1.5"></line>
</svg>`;

// Panitera SVG (Col 3)
// Passes Hakim's line through to Sistem CIMS (at y=27).
// Receives return line from Sistem CIMS (at y=40).
// Creates a Rect at y=27, then line down to row 3.
const paniteraSvg = `<svg class="flowSvg" viewBox="0 0 104 54">
    <!-- Pass-through line from Hakim to CIMS (y=27) -->
    <line x1="0" y1="27" x2="104" y2="27" stroke="#111" stroke-width="1.5"></line>
    <!-- Receive return line from CIMS (y=40) -->
    <line x1="104" y1="40" x2="82" y2="40" stroke="#111" stroke-width="1.5"></line>
    <polygon points="82,40 89,36 89,44" fill="#111"></polygon>
    
    <!-- Panitera Rect for Unggah Penetapan -->
    <rect x="22" y="27" width="60" height="26" fill="none" stroke="#111" stroke-width="1.7"></rect>
    <line x1="52" y1="53" x2="52" y2="54" stroke="#111" stroke-width="1.5"></line>
</svg>`;

// Sistem CIMS SVG (Col 4)
// Receives line from Panitera at y=27.
// Creates a Rect (Provisioning).
// Sends line back left to Panitera at y=40.
const cimsSvg = `<svg class="flowSvg" viewBox="0 0 104 54">
    <!-- Receive from Panitera -->
    <line x1="0" y1="27" x2="22" y2="27" stroke="#111" stroke-width="1.5"></line>
    <polygon points="22,27 15,23 15,31" fill="#111"></polygon>
    
    <!-- CIMS Provisioning Rect -->
    <rect x="22" y="14" width="60" height="26" rx="13" fill="none" stroke="#111" stroke-width="1.7"></rect>
    
    <!-- Send line left back to Panitera -->
    <line x1="22" y1="40" x2="0" y2="40" stroke="#111" stroke-width="1.5"></line>
    
    <!-- Pass the line from Row 1 down to Row 3 for the CIMS bridge -->
    <!-- Wait, Row 1 CIMS doesn't send down right now. Let's just keep it contained to Row 2. -->
</svg>`;

row2Tds.eq(0).html(hakimSvg);
row2Tds.eq(1).html(paniteraSvg);
row2Tds.eq(2).html(cimsSvg);

// Update Row 2 Text
const trRow2 = trs.eq(1);
trRow2
  .find('.tight')
  .html(
    'Menetapkan agenda sidang, provisioning ruang virtual otomatis, dan mengunggah penetapan pemberitahuan sidang pembacaan putusan'
  );

// Row 6 (Aktivitas 6) Text update
const trRow6 = trs.eq(5);
trRow6
  .find('.tight')
  .html('Aktivasi/pembukaan ruang sidang virtual, registrasi kehadiran, dan pelaksanaan sidang');

fs.writeFileSync('./docs/sop-format-siappakai.html', $.html());
