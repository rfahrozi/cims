const fs = require('fs');

let html = fs.readFileSync('./docs/sop-format-siappakai.html', 'utf8');

// 1. Fix Row 2 Hakim (Col 1)
html = html.replace(
  /<td class="flow center">\s*<svg class="flowSvg" viewBox="0 0 104 54">\s*<line x1="104" y1="0" x2="52" y2="0" stroke="#111" stroke-width="1.5"><\/line>\s*<line x1="52" y1="0" x2="52" y2="14" stroke="#111" stroke-width="1.5"><\/line>\s*<polygon points="52,14 48,7 56,7" fill="#111"><\/polygon>\s*<rect x="22" y="14" width="60" height="26" fill="none" stroke="#111" stroke-width="1.7"><\/rect>\s*<line x1="82" y1="27" x2="104" y2="27" stroke="#111" stroke-width="1.5"><\/line>\s*<polygon points="104,27 97,23 97,31" fill="#111"><\/polygon>\s*<\/svg>\s*<\/td>/,
  `<td class="flow center">
    <svg class="flowSvg" viewBox="0 0 104 54">
        <line x1="52" y1="0" x2="52" y2="14" stroke="#111" stroke-width="1.5"></line>
        <polygon points="52,14 48,7 56,7" fill="#111"></polygon>
        <rect x="22" y="14" width="60" height="26" fill="none" stroke="#111" stroke-width="1.7"></rect>
        <line x1="82" y1="27" x2="104" y2="27" stroke="#111" stroke-width="1.5"></line>
        <polygon points="104,27 97,23 97,31" fill="#111"></polygon>
    </svg>
</td>`
);

// 2. Fix Row 5 System CIMS (Text "Ya")
html = html.replace(
  /<text x="44" y="52" font-size="9" fill="#111">Ya<\/text>/,
  `<text x="36" y="46" font-size="10" fill="#111">Ya</text>`
);

// 3. Fix Row 5 Rutan (Text "Tidak" and Offset Return Line)
html = html.replace(
  /<td class="flow center">\s*<svg class="flowSvg" viewBox="0 0 104 54">\s*<line x1="0" y1="27" x2="52" y2="27" stroke="#111" stroke-width="1.5"><\/line>\s*<line x1="52" y1="27" x2="52" y2="0" stroke="#111" stroke-width="1.5"><\/line>\s*<polygon points="52,0 48,7 56,7" fill="#111"><\/polygon>\s*<text x="39" y="38" font-size="9" fill="#111">Tidak<\/text>\s*<\/svg>\s*<\/td>/,
  `<td class="flow center">
    <svg class="flowSvg" viewBox="0 0 104 54">
        <line x1="0" y1="27" x2="82" y2="27" stroke="#111" stroke-width="1.5"></line>
        <line x1="82" y1="27" x2="82" y2="0" stroke="#111" stroke-width="1.5"></line>
        <polygon points="82,0 78,7 86,7" fill="#111"></polygon>
        <text x="35" y="20" font-size="10" fill="#111">Tidak</text>
    </svg>
</td>`
);

// 4. Fix Row 4 Rutan (Receive Offset Return Line)
html = html.replace(
  /<td class="flow center">\s*<svg class="flowSvg" viewBox="0 0 104 54">\s*<line x1="0" y1="27" x2="22" y2="27" stroke="#111" stroke-width="1.5"><\/line>\s*<rect x="22" y="14" width="60" height="26" fill="none" stroke="#111" stroke-width="1.7"><\/rect>\s*<line x1="52" y1="40" x2="52" y2="54" stroke="#111" stroke-width="1.5"><\/line>\s*<line x1="52" y1="40" x2="0" y2="40" stroke="#111" stroke-width="1.5"><\/line>\s*<\/svg>\s*<\/td>/,
  `<td class="flow center">
    <svg class="flowSvg" viewBox="0 0 104 54">
        <line x1="0" y1="27" x2="22" y2="27" stroke="#111" stroke-width="1.5"></line>
        <rect x="22" y="14" width="60" height="26" fill="none" stroke="#111" stroke-width="1.7"></rect>
        <line x1="52" y1="40" x2="52" y2="54" stroke="#111" stroke-width="1.5"></line>
        
        <!-- Return Path "Tidak" entering box -->
        <line x1="82" y1="54" x2="82" y2="27" stroke="#111" stroke-width="1.5"></line>
        <line x1="82" y1="27" x2="52" y2="27" stroke="#111" stroke-width="1.5"></line>
        <!-- Outgoing left line -->
        <line x1="52" y1="40" x2="0" y2="40" stroke="#111" stroke-width="1.5"></line>
    </svg>
</td>`
);

// 5. Fix Row 6 Overlaps
// Replace Hakim Row 6
html = html.replace(
  /<td class="flow center">\s*<svg class="flowSvg" viewBox="0 0 104 54">\s*<line x1="104" y1="27" x2="82" y2="27" stroke="#111" stroke-width="1.5"><\/line>\s*<polygon points="82,27 89,23 89,31" fill="#111"><\/polygon>\s*<rect x="22" y="14" width="60" height="26" fill="none" stroke="#111" stroke-width="1.7"><\/rect>\s*<line x1="82" y1="40" x2="104" y2="40" stroke="#111" stroke-width="1.5"><\/line>\s*<polygon points="104,40 97,36 97,44" fill="#111"><\/polygon>\s*<\/svg>\s*<\/td>/,
  `<td class="flow center">
    <svg class="flowSvg" viewBox="0 0 104 54">
        <!-- Receive from right at y=10 -->
        <line x1="104" y1="10" x2="52" y2="10" stroke="#111" stroke-width="1.5"></line>
        <line x1="52" y1="10" x2="52" y2="14" stroke="#111" stroke-width="1.5"></line>
        <polygon points="52,14 48,7 56,7" fill="#111"></polygon>
        
        <rect x="22" y="14" width="60" height="26" fill="none" stroke="#111" stroke-width="1.7"></rect>
        
        <!-- Output right at y=40 -->
        <line x1="82" y1="40" x2="104" y2="40" stroke="#111" stroke-width="1.5"></line>
        <polygon points="104,40 97,36 97,44" fill="#111"></polygon>
    </svg>
</td>`
);

// Replace Panitera Row 6
html = html.replace(
  /<td class="flow center">\s*<svg class="flowSvg" viewBox="0 0 104 54">\s*<line x1="104" y1="27" x2="0" y2="27" stroke="#111" stroke-width="1.5"><\/line>\s*<rect x="22" y="27" width="60" height="26" fill="none" stroke="#111" stroke-width="1.7"><\/rect>\s*<line x1="0" y1="40" x2="22" y2="40" stroke="#111" stroke-width="1.5"><\/line>\s*<line x1="52" y1="53" x2="52" y2="54" stroke="#111" stroke-width="1.5"><\/line>\s*<\/svg>\s*<\/td>/,
  `<td class="flow center">
    <svg class="flowSvg" viewBox="0 0 104 54">
        <!-- Pass-through from CIMS to Hakim at y=10 -->
        <line x1="104" y1="10" x2="0" y2="10" stroke="#111" stroke-width="1.5"></line>
        
        <!-- Panitera Box receives from Hakim at y=40 -->
        <rect x="22" y="27" width="60" height="26" fill="none" stroke="#111" stroke-width="1.7"></rect>
        <line x1="0" y1="40" x2="22" y2="40" stroke="#111" stroke-width="1.5"></line>
        <polygon points="22,40 15,36 15,44" fill="#111"></polygon>
        
        <line x1="52" y1="53" x2="52" y2="54" stroke="#111" stroke-width="1.5"></line>
    </svg>
</td>`
);

// Replace CIMS Row 6
html = html.replace(
  /<td class="flow center">\s*<svg class="flowSvg" viewBox="0 0 104 54">\s*<line x1="52" y1="0" x2="52" y2="27" stroke="#111" stroke-width="1.5"><\/line>\s*<line x1="52" y1="27" x2="0" y2="27" stroke="#111" stroke-width="1.5"><\/line>\s*<\/svg>\s*<\/td>/,
  `<td class="flow center">
    <svg class="flowSvg" viewBox="0 0 104 54">
        <!-- Send from Row 5 down to y=10 and left -->
        <line x1="52" y1="0" x2="52" y2="10" stroke="#111" stroke-width="1.5"></line>
        <line x1="52" y1="10" x2="0" y2="10" stroke="#111" stroke-width="1.5"></line>
    </svg>
</td>`
);

fs.writeFileSync('./docs/sop-format-siappakai.html', html);
