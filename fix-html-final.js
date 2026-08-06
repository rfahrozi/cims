const fs = require('fs');
let html = fs.readFileSync('./docs/sop-format-siappakai.html', 'utf8');

// Row 1: Panitera (Panitera -> Sistem CIMS)
html = html.replace(
  /<td class="flow center"><svg class="flowSvg" viewBox="0 0 104 54"><rect x="22" y="14" width="60" height="26" rx="13" fill="none" stroke="#111" stroke-width="1.7"><\/rect><line x1="52" y1="40" x2="52" y2="54" stroke="#111" stroke-width="1.5"><\/line><polygon points="52,54 48,47 56,47" fill="#111"><\/polygon><\/svg><\/td>/,
  `<td class="flow center">
    <svg class="flowSvg" viewBox="0 0 104 54">
        <rect x="22" y="14" width="60" height="26" rx="13" fill="none" stroke="#111" stroke-width="1.7"></rect>
        <line x1="82" y1="27" x2="104" y2="27" stroke="#111" stroke-width="1.5"></line>
        <polygon points="104,27 97,23 97,31" fill="#111"></polygon>
    </svg>
</td>`
);

// Row 1: Sistem CIMS
html = html.replace(
  /<td class="flow center"><svg class="flowSvg" viewBox="0 0 104 54"><\/svg><\/td>\s*<td class="flow center"><svg class="flowSvg" viewBox="0 0 104 54"><\/svg><\/td>\s*<td class="flow center"><svg class="flowSvg" viewBox="0 0 104 54"><\/svg><\/td>\s*<td>Data perkara/,
  `<td class="flow center">
    <svg class="flowSvg" viewBox="0 0 104 54">
        <line x1="0" y1="27" x2="22" y2="27" stroke="#111" stroke-width="1.5"></line>
        <rect x="22" y="14" width="60" height="26" fill="none" stroke="#111" stroke-width="1.7"></rect>
        <line x1="52" y1="40" x2="52" y2="54" stroke="#111" stroke-width="1.5"></line>
    </svg>
</td>
<td class="flow center"><svg class="flowSvg" viewBox="0 0 104 54"></svg></td>
<td class="flow center"><svg class="flowSvg" viewBox="0 0 104 54"></svg></td>
<td>Data perkara`
);

// Row 2: Hakim
html = html.replace(
  /<td class="flow center"><svg class="flowSvg" viewBox="0 0 104 54"><rect x="22" y="14" width="60" height="26" fill="none" stroke="#111" stroke-width="1.7"><\/rect><line x1="82" y1="27" x2="104" y2="27" stroke="#111" stroke-width="1.5"><\/line><polygon points="104,27 97,23 97,31" fill="#111"><\/polygon><\/svg><\/td>/,
  `<td class="flow center">
    <svg class="flowSvg" viewBox="0 0 104 54">
        <line x1="104" y1="0" x2="52" y2="0" stroke="#111" stroke-width="1.5"></line>
        <line x1="52" y1="0" x2="52" y2="14" stroke="#111" stroke-width="1.5"></line>
        <polygon points="52,14 48,7 56,7" fill="#111"></polygon>
        <rect x="22" y="14" width="60" height="26" fill="none" stroke="#111" stroke-width="1.7"></rect>
        <line x1="82" y1="27" x2="104" y2="27" stroke="#111" stroke-width="1.5"></line>
        <polygon points="104,27 97,23 97,31" fill="#111"></polygon>
    </svg>
</td>`
);

// Row 2: Panitera
html = html.replace(
  /<td class="flow center"><svg class="flowSvg" viewBox="0 0 104 54"><line x1="52" y1="0" x2="52" y2="14" stroke="#111" stroke-width="1.5"><\/line><rect x="22" y="14" width="60" height="26" fill="none" stroke="#111" stroke-width="1.7"><\/rect><line x1="0" y1="27" x2="22" y2="27" stroke="#111" stroke-width="1.5"><\/line><line x1="52" y1="40" x2="52" y2="54" stroke="#111" stroke-width="1.5"><\/line><polygon points="52,54 48,47 56,47" fill="#111"><\/polygon><\/svg><\/td>/,
  `<td class="flow center">
    <svg class="flowSvg" viewBox="0 0 104 54">
        <rect x="22" y="14" width="60" height="26" fill="none" stroke="#111" stroke-width="1.7"></rect>
        <line x1="0" y1="27" x2="22" y2="27" stroke="#111" stroke-width="1.5"></line>
        <line x1="52" y1="40" x2="52" y2="54" stroke="#111" stroke-width="1.5"></line>
        <polygon points="52,54 48,47 56,47" fill="#111"></polygon>
    </svg>
</td>`
);

// Row 4: Panitera
html = html.replace(
  /<td class="center">4<\/td>\s*<td class="tight">Pengisian checklist kesiapan sidang elektronik oleh seluruh pihak<\/td>\s*<td class="flow center"><svg class="flowSvg" viewBox="0 0 104 54"><\/svg><\/td>/,
  `<td class="center">4</td>
<td class="tight">Pengisian checklist kesiapan sidang elektronik oleh seluruh pihak</td>
<td class="flow center">
    <svg class="flowSvg" viewBox="0 0 104 54">
        <line x1="104" y1="27" x2="82" y2="27" stroke="#111" stroke-width="1.5"></line>
        <polygon points="82,27 89,23 89,31" fill="#111"></polygon>
        <rect x="22" y="14" width="60" height="26" fill="none" stroke="#111" stroke-width="1.7"></rect>
        <line x1="52" y1="40" x2="52" y2="54" stroke="#111" stroke-width="1.5"></line>
    </svg>
</td>`
);

// Row 4: Sistem CIMS
html = html.replace(
  /<td class="flow center"><svg class="flowSvg" viewBox="0 0 104 54"><line x1="104" y1="40" x2="52" y2="40" stroke="#111" stroke-width="1.5"><\/line><line x1="52" y1="40" x2="52" y2="54" stroke="#111" stroke-width="1.5"><\/line><polygon points="52,54 48,47 56,47" fill="#111"><\/polygon><\/svg><\/td>/,
  `<td class="flow center">
    <svg class="flowSvg" viewBox="0 0 104 54">
        <line x1="104" y1="27" x2="0" y2="27" stroke="#111" stroke-width="1.5"></line>
        <line x1="104" y1="40" x2="52" y2="40" stroke="#111" stroke-width="1.5"></line>
        <line x1="52" y1="40" x2="52" y2="54" stroke="#111" stroke-width="1.5"></line>
        <polygon points="52,54 48,47 56,47" fill="#111"></polygon>
    </svg>
</td>`
);

fs.writeFileSync('./docs/sop-format-siappakai.html', html);
