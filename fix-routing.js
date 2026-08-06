const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('./docs/sop-format-siappakai.html', 'utf8');
const $ = cheerio.load(html);

const emptySVG = '<svg class="flowSvg" viewBox="0 0 104 54"></svg>';

const trs = $('.process tr').slice(2);

function setCells(rowIndex, svgs) {
  const tds = trs.eq(rowIndex).find('.flow.center');
  for (let i = 0; i < 5; i++) {
    tds.eq(i).html(svgs[i] || '');
  }
}

// Ensure the HTML string template parts are properly escaped and concatenated, without breaking Node
const svg1 =
  '<svg class="flowSvg" viewBox="0 0 104 54"><rect x="22" y="14" width="60" height="26" rx="13" fill="none" stroke="#111" stroke-width="1.7"></rect><line x1="52" y1="40" x2="52" y2="54" stroke="#111" stroke-width="1.5"></line><polygon points="52,54 48,47 56,47" fill="#111"></polygon></svg>';

setCells(0, [
  emptySVG,
  svg1, // Panitera
  emptySVG,
  emptySVG,
  emptySVG
]);

const svg2Hakim =
  '<svg class="flowSvg" viewBox="0 0 104 54"><rect x="22" y="14" width="60" height="26" fill="none" stroke="#111" stroke-width="1.7"></rect><line x1="82" y1="27" x2="104" y2="27" stroke="#111" stroke-width="1.5"></line><polygon points="104,27 97,23 97,31" fill="#111"></polygon></svg>';
const svg2Panitera =
  '<svg class="flowSvg" viewBox="0 0 104 54"><line x1="52" y1="0" x2="52" y2="14" stroke="#111" stroke-width="1.5"></line><rect x="22" y="14" width="60" height="26" fill="none" stroke="#111" stroke-width="1.7"></rect><line x1="0" y1="27" x2="22" y2="27" stroke="#111" stroke-width="1.5"></line><line x1="52" y1="40" x2="52" y2="54" stroke="#111" stroke-width="1.5"></line><polygon points="52,54 48,47 56,47" fill="#111"></polygon></svg>';

setCells(1, [svg2Hakim, svg2Panitera, emptySVG, emptySVG, emptySVG]);

const svg3Panitera =
  '<svg class="flowSvg" viewBox="0 0 104 54"><line x1="52" y1="0" x2="52" y2="27" stroke="#111" stroke-width="1.5"></line><line x1="52" y1="27" x2="104" y2="27" stroke="#111" stroke-width="1.5"></line><polygon points="104,27 97,23 97,31" fill="#111"></polygon></svg>';
const svg3Sistem =
  '<svg class="flowSvg" viewBox="0 0 104 54"><line x1="0" y1="27" x2="104" y2="27" stroke="#111" stroke-width="1.5"></line><polygon points="104,27 97,23 97,31" fill="#111"></polygon></svg>';
const svg3Kejaksaan =
  '<svg class="flowSvg" viewBox="0 0 104 54"><line x1="0" y1="27" x2="22" y2="27" stroke="#111" stroke-width="1.5"></line><rect x="22" y="14" width="60" height="26" fill="none" stroke="#111" stroke-width="1.7"></rect><line x1="52" y1="40" x2="52" y2="54" stroke="#111" stroke-width="1.5"></line><polygon points="52,54 48,47 56,47" fill="#111"></polygon></svg>';

setCells(2, [emptySVG, svg3Panitera, svg3Sistem, svg3Kejaksaan, emptySVG]);

const svg4Sistem =
  '<svg class="flowSvg" viewBox="0 0 104 54"><line x1="104" y1="40" x2="52" y2="40" stroke="#111" stroke-width="1.5"></line><line x1="52" y1="40" x2="52" y2="54" stroke="#111" stroke-width="1.5"></line><polygon points="52,54 48,47 56,47" fill="#111"></polygon></svg>';
const svg4Kejaksaan =
  '<svg class="flowSvg" viewBox="0 0 104 54"><line x1="52" y1="0" x2="52" y2="27" stroke="#111" stroke-width="1.5"></line><line x1="52" y1="27" x2="104" y2="27" stroke="#111" stroke-width="1.5"></line><polygon points="104,27 97,23 97,31" fill="#111"></polygon><line x1="104" y1="40" x2="0" y2="40" stroke="#111" stroke-width="1.5"></line></svg>';
const svg4Rutan =
  '<svg class="flowSvg" viewBox="0 0 104 54"><line x1="0" y1="27" x2="22" y2="27" stroke="#111" stroke-width="1.5"></line><rect x="22" y="14" width="60" height="26" fill="none" stroke="#111" stroke-width="1.7"></rect><line x1="52" y1="40" x2="52" y2="54" stroke="#111" stroke-width="1.5"></line><line x1="52" y1="40" x2="0" y2="40" stroke="#111" stroke-width="1.5"></line></svg>';

setCells(3, [emptySVG, emptySVG, svg4Sistem, svg4Kejaksaan, svg4Rutan]);

const svg5Sistem =
  '<svg class="flowSvg" viewBox="0 0 104 54"><line x1="52" y1="0" x2="52" y2="10" stroke="#111" stroke-width="1.5"></line><polygon points="52,10 76,27 52,44 28,27" fill="none" stroke="#111" stroke-width="1.7"></polygon><text x="44" y="52" font-size="9" fill="#111">Ya</text><line x1="52" y1="44" x2="52" y2="54" stroke="#111" stroke-width="1.5"></line><polygon points="52,54 48,47 56,47" fill="#111"></polygon><line x1="76" y1="27" x2="104" y2="27" stroke="#111" stroke-width="1.5"></line></svg>';
const svg5Kejaksaan =
  '<svg class="flowSvg" viewBox="0 0 104 54"><line x1="0" y1="27" x2="104" y2="27" stroke="#111" stroke-width="1.5"></line></svg>';
const svg5Rutan =
  '<svg class="flowSvg" viewBox="0 0 104 54"><line x1="0" y1="27" x2="52" y2="27" stroke="#111" stroke-width="1.5"></line><line x1="52" y1="27" x2="52" y2="0" stroke="#111" stroke-width="1.5"></line><polygon points="52,0 48,7 56,7" fill="#111"></polygon><text x="40" y="38" font-size="9" fill="#111">Tidak</text></svg>';

setCells(4, [emptySVG, emptySVG, svg5Sistem, svg5Kejaksaan, svg5Rutan]);

const svg6Hakim =
  '<svg class="flowSvg" viewBox="0 0 104 54"><line x1="104" y1="27" x2="82" y2="27" stroke="#111" stroke-width="1.5"></line><polygon points="82,27 89,23 89,31" fill="#111"></polygon><rect x="22" y="14" width="60" height="26" fill="none" stroke="#111" stroke-width="1.7"></rect><line x1="82" y1="40" x2="104" y2="40" stroke="#111" stroke-width="1.5"></line><polygon points="104,40 97,36 97,44" fill="#111"></polygon></svg>';
const svg6Panitera =
  '<svg class="flowSvg" viewBox="0 0 104 54"><line x1="104" y1="27" x2="0" y2="27" stroke="#111" stroke-width="1.5"></line><rect x="22" y="27" width="60" height="26" fill="none" stroke="#111" stroke-width="1.7"></rect><line x1="0" y1="40" x2="22" y2="40" stroke="#111" stroke-width="1.5"></line><line x1="52" y1="53" x2="52" y2="54" stroke="#111" stroke-width="1.5"></line></svg>';
const svg6Sistem =
  '<svg class="flowSvg" viewBox="0 0 104 54"><line x1="52" y1="0" x2="52" y2="27" stroke="#111" stroke-width="1.5"></line><line x1="52" y1="27" x2="0" y2="27" stroke="#111" stroke-width="1.5"></line></svg>';

setCells(5, [svg6Hakim, svg6Panitera, svg6Sistem, emptySVG, emptySVG]);

const svg7Panitera =
  '<svg class="flowSvg" viewBox="0 0 104 54"><line x1="52" y1="0" x2="52" y2="14" stroke="#111" stroke-width="1.5"></line><rect x="22" y="14" width="60" height="26" fill="none" stroke="#111" stroke-width="1.7"></rect><line x1="52" y1="40" x2="52" y2="54" stroke="#111" stroke-width="1.5"></line><polygon points="52,54 48,47 56,47" fill="#111"></polygon></svg>';

setCells(6, [emptySVG, svg7Panitera, emptySVG, emptySVG, emptySVG]);

const svg8Panitera =
  '<svg class="flowSvg" viewBox="0 0 104 54"><line x1="52" y1="0" x2="52" y2="14" stroke="#111" stroke-width="1.5"></line><rect x="22" y="14" width="60" height="26" rx="13" fill="none" stroke="#111" stroke-width="1.7"></rect></svg>';

setCells(7, [emptySVG, svg8Panitera, emptySVG, emptySVG, emptySVG]);

fs.writeFileSync('./docs/sop-format-siappakai.html', $.html());
