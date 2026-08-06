const fs = require('fs');

let html = fs.readFileSync('./docs/sop-format-siappakai.html', 'utf8');

// 1. ROW 1
html = html.replace(
  /<td class="flow center">\s*<svg class="flowSvg" viewBox="0 0 104 54">\s*<line x1="0" y1="27" x2="22" y2="27" stroke="#111" stroke-width="1.5"><\/line>\s*<rect x="22" y="14" width="60" height="26" fill="none" stroke="#111" stroke-width="1.7"><\/rect>\s*<line x1="52" y1="40" x2="52" y2="54" stroke="#111" stroke-width="1.5"><\/line>\s*<\/svg>\s*<\/td>\s*<td class="flow center"><svg class="flowSvg" viewBox="0 0 104 54"><\/svg><\/td>\s*<td class="flow center"><svg class="flowSvg" viewBox="0 0 104 54"><\/svg><\/td>\s*<td>Data perkara/,
  `<td class="flow center">
    <svg class="flowSvg" viewBox="0 0 104 54">
        <line x1="0" y1="27" x2="22" y2="27" stroke="#111" stroke-width="1.5"></line>
        <rect x="22" y="14" width="60" height="26" fill="none" stroke="#111" stroke-width="1.7"></rect>
    </svg>
</td>
<td class="flow center"><svg class="flowSvg" viewBox="0 0 104 54"></svg></td>
<td class="flow center"><svg class="flowSvg" viewBox="0 0 104 54"></svg></td>
<td>Data perkara`
);

// 3. ROW 5
html = html.replace(
  /<td class="flow center">\s*<svg class="flowSvg" viewBox="0 0 104 54">\s*<line x1="52" y1="0" x2="52" y2="10" stroke="#111" stroke-width="1.5"><\/line>\s*<polygon points="52,10 76,27 52,44 28,27" fill="none" stroke="#111" stroke-width="1.7"><\/polygon>\s*<text x="44" y="52" font-size="9" fill="#111">Ya<\/text>\s*<line x1="52" y1="44" x2="52" y2="54" stroke="#111" stroke-width="1.5"><\/line>\s*<polygon points="52,54 48,47 56,47" fill="#111"><\/polygon>\s*<line x1="76" y1="27" x2="104" y2="27" stroke="#111" stroke-width="1.5"><\/line>\s*<\/svg>\s*<\/td>/,
  `<td class="flow center">
    <svg class="flowSvg" viewBox="0 0 104 54">
        <line x1="52" y1="0" x2="52" y2="10" stroke="#111" stroke-width="1.5"></line>
        <polygon points="52,10 76,27 52,44 28,27" fill="none" stroke="#111" stroke-width="1.7"></polygon>
        <text x="36" y="46" font-size="10" fill="#111">Ya</text>
        <line x1="52" y1="44" x2="52" y2="54" stroke="#111" stroke-width="1.5"></line>
        <polygon points="52,54 48,47 56,47" fill="#111"></polygon>
        <line x1="76" y1="27" x2="104" y2="27" stroke="#111" stroke-width="1.5"></line>
        <text x="80" y="22" font-size="10" fill="#111">Tidak</text>
    </svg>
</td>`
);

// Rutan in Row 5
html = html.replace(
  /<td class="flow center">\s*<svg class="flowSvg" viewBox="0 0 104 54">\s*<line x1="0" y1="27" x2="52" y2="27" stroke="#111" stroke-width="1.5"><\/line>\s*<line x1="52" y1="27" x2="52" y2="0" stroke="#111" stroke-width="1.5"><\/line>\s*<polygon points="52,0 48,7 56,7" fill="#111"><\/polygon>\s*<text x="40" y="38" font-size="9" fill="#111">Tidak<\/text>\s*<\/svg>\s*<\/td>/,
  `<td class="flow center">
    <svg class="flowSvg" viewBox="0 0 104 54">
        <line x1="0" y1="27" x2="82" y2="27" stroke="#111" stroke-width="1.5"></line>
        <line x1="82" y1="27" x2="82" y2="0" stroke="#111" stroke-width="1.5"></line>
        <polygon points="82,0 78,7 86,7" fill="#111"></polygon>
    </svg>
</td>`
);

fs.writeFileSync('./docs/sop-format-siappakai.html', html);
