const fs = require('fs');
let html = fs.readFileSync('./docs/sop-format-siappakai.html', 'utf8');

// Row 2 -> Row 3 connection inside Panitera
// In row 3, Panitera currently has this:
/*
<td class="flow center">
    <svg class="flowSvg" viewBox="0 0 104 54">
        <line x1="52" y1="0" x2="52" y2="54" stroke="#111" stroke-width="1.5"></line>
    </svg>
</td>
*/
// The user's image shows a continuous vertical line in Panitera for Row 3. This seems correct.

// Row 4 (Checklist) issue:
// The image shows the line coming from Kejaksaan Row 3, down to row 4 Kejaksaan.
// Then in row 4 Kejaksaan, the line goes right into Rutan/Lapas box, AND there is an arrow pointing left.
// Let's check row 4 HTML:
/*
<tr>
        <td class="center">4</td>
        <td class="tight">Pengisian checklist kesiapan sidang elektronik oleh seluruh pihak</td>
        <td class="flow center">
        <svg class="flowSvg" viewBox="0 0 104 54">
            <line x1="52" y1="0" x2="52" y2="14" stroke="#111" stroke-width="1.5"></line>
            <rect x="22" y="14" width="60" height="26" fill="none" stroke="#111" stroke-width="1.7"></rect>
            <line x1="52" y1="40" x2="52" y2="54" stroke="#111" stroke-width="1.5"></line>
            <polygon points="52,54 48,47 56,47" fill="#111"></polygon>
        </svg>
    </td>
        <td class="flow center">
        <svg class="flowSvg" viewBox="0 0 104 54">
            <line x1="52" y1="0" x2="52" y2="14" stroke="#111" stroke-width="1.5"></line>
            <line x1="52" y1="14" x2="104" y2="14" stroke="#111" stroke-width="1.5"></line>
            <polygon points="104,14 97,10 97,18" fill="#111"></polygon>
            <line x1="22" y1="27" x2="52" y2="27" stroke="#111" stroke-width="1.5"></line>
            <polygon points="22,27 29,23 29,31" fill="#111"></polygon>
        </svg>
    </td>
        <td class="flow center">
        <svg class="flowSvg" viewBox="0 0 104 54">
            <line x1="0" y1="14" x2="52" y2="14" stroke="#111" stroke-width="1.5"></line>
            <rect x="22" y="14" width="60" height="26" fill="none" stroke="#111" stroke-width="1.7"></rect>
            <line x1="52" y1="40" x2="52" y2="54" stroke="#111" stroke-width="1.5"></line>
            <polygon points="52,54 48,47 56,47" fill="#111"></polygon>
        </svg>
    </td>
*/

// Row 5 (Evaluasi) issue:
// Kejaksaan in row 5 currently has this:
/*
<td class="flow center">
    <svg class="flowSvg" viewBox="0 0 104 54">
        <line x1="0" y1="27" x2="104" y2="27" stroke="#111" stroke-width="1.5"></line>
        <polygon points="104,27 97,23 97,31" fill="#111"></polygon>
    </svg>
</td>
*/
// The image shows the line coming from the Decision diamond (Panitera), crossing Kejaksaan, to Rutan/Lapas.
// Wait, looking at the image:
// Row 4: Line from Row 3 (Kejaksaan) goes down, turns RIGHT, enters Rutan/Lapas rect.
// In Row 4 Kejaksaan, there's also an arrow pointing LEFT coming from Rutan/Lapas, but it stops in the middle of Kejaksaan. Actually, looking closer at the image, there's a line pointing left from Rutan/Lapas back to Panitera, but it's broken in Kejaksaan.
// Wait, the "Tidak" path goes from Row 5 Rutan/Lapas, UP to Row 4 Rutan/Lapas, then LEFT through Kejaksaan to Panitera?
// Let's re-examine the user's provided screenshot.
// In the user's screenshot:
// Row 4:
// - Panitera has a rect. It receives a line from Row 3 Panitera.
// - Kejaksaan receives a line from Row 3 Kejaksaan. The line goes down, then right to Rutan. Also, there is a line coming from Rutan going left to Panitera. The line going left has an arrow pointing left, but it's broken (not touching Panitera's rect).
// - Rutan/Lapas has a rect. It receives the line from Kejaksaan (left). It outputs a line down (to row 5).

// Let's fix Row 4 Kejaksaan to exactly match the image's layout but connect the left line properly.
html = html.replace(
  /<td class=\"flow center\">\s*<svg class=\"flowSvg\" viewBox=\"0 0 104 54\">\s*<line x1=\"52\" y1=\"0\" x2=\"52\" y2=\"14\" stroke=\"#111\" stroke-width=\"1.5\"><\/line>\s*<line x1=\"52\" y1=\"14\" x2=\"104\" y2=\"14\" stroke=\"#111\" stroke-width=\"1.5\"><\/line>\s*<polygon points=\"104,14 97,10 97,18\" fill=\"#111\"><\/polygon>\s*<line x1=\"22\" y1=\"27\" x2=\"52\" y2=\"27\" stroke=\"#111\" stroke-width=\"1.5\"><\/line>\s*<polygon points=\"22,27 29,23 29,31\" fill=\"#111\"><\/polygon>\s*<\/svg>\s*<\/td>/s,
  `<td class="flow center">
        <svg class="flowSvg" viewBox="0 0 104 54">
            <!-- Line coming down from Row 3 Kejaksaan, turning right to Rutan -->
            <line x1="52" y1="0" x2="52" y2="27" stroke="#111" stroke-width="1.5"></line>
            <line x1="52" y1="27" x2="104" y2="27" stroke="#111" stroke-width="1.5"></line>
            <polygon points="104,27 97,23 97,31" fill="#111"></polygon>
            
            <!-- Return line coming from Rutan (right) going left to Panitera -->
            <line x1="104" y1="40" x2="0" y2="40" stroke="#111" stroke-width="1.5"></line>
            <polygon points="0,40 7,36 7,44" fill="#111"></polygon>
        </svg>
    </td>`
);

// Now fix Row 4 Rutan/Lapas to match
html = html.replace(
  /<td class=\"flow center\">\s*<svg class=\"flowSvg\" viewBox=\"0 0 104 54\">\s*<line x1=\"0\" y1=\"14\" x2=\"52\" y2=\"14\" stroke=\"#111\" stroke-width=\"1.5\"><\/line>\s*<rect x=\"22\" y=\"14\" width=\"60\" height=\"26\" fill=\"none\" stroke=\"#111\" stroke-width=\"1.7\"><\/rect>\s*<line x1=\"52\" y1=\"40\" x2=\"52\" y2=\"54\" stroke=\"#111\" stroke-width=\"1.5\"><\/line>\s*<polygon points=\"52,54 48,47 56,47\" fill=\"#111\"><\/polygon>\s*<\/svg>\s*<\/td>/s,
  `<td class="flow center">
        <svg class="flowSvg" viewBox="0 0 104 54">
            <line x1="0" y1="27" x2="22" y2="27" stroke="#111" stroke-width="1.5"></line>
            <rect x="22" y="14" width="60" height="26" fill="none" stroke="#111" stroke-width="1.7"></rect>
            <line x1="52" y1="40" x2="52" y2="54" stroke="#111" stroke-width="1.5"></line>
            <polygon points="52,54 48,47 56,47" fill="#111"></polygon>
        </svg>
    </td>`
);

// Also we need to fix Row 4 Panitera to receive the line from Kejaksaan
html = html.replace(
  /<td class=\"flow center\">\s*<svg class=\"flowSvg\" viewBox=\"0 0 104 54\">\s*<line x1=\"52\" y1=\"0\" x2=\"52\" y2=\"14\" stroke=\"#111\" stroke-width=\"1.5\"><\/line>\s*<rect x=\"22\" y=\"14\" width=\"60\" height=\"26\" fill=\"none\" stroke=\"#111\" stroke-width=\"1.7\"><\/rect>\s*<line x1=\"52\" y1=\"40\" x2=\"52\" y2=\"54\" stroke=\"#111\" stroke-width=\"1.5\"><\/line>\s*<polygon points=\"52,54 48,47 56,47\" fill=\"#111\"><\/polygon>\s*<\/svg>\s*<\/td>/s,
  `<td class="flow center">
        <svg class="flowSvg" viewBox="0 0 104 54">
            <line x1="52" y1="0" x2="52" y2="14" stroke="#111" stroke-width="1.5"></line>
            <rect x="22" y="14" width="60" height="26" fill="none" stroke="#111" stroke-width="1.7"></rect>
            <line x1="52" y1="40" x2="52" y2="54" stroke="#111" stroke-width="1.5"></line>
            <polygon points="52,54 48,47 56,47" fill="#111"></polygon>
            
            <!-- Receive line from Kejaksaan -->
            <line x1="104" y1="40" x2="82" y2="40" stroke="#111" stroke-width="1.5"></line>
        </svg>
    </td>`
);

fs.writeFileSync('./docs/sop-format-siappakai.html', html);
