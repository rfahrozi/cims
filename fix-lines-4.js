const fs = require('fs');
let html = fs.readFileSync('./docs/sop-format-siappakai.html', 'utf8');

// The line going left in Kejaksaan row 4 from my previous attempt looks slightly wrong compared to the image.
// In the user's image, row 4 Kejaksaan has a LEFT arrow right below the rect. But wait, it's just floating there.
// Let's restore row 4 to just have the connection from row 3 going right to rutan, and remove the floating left arrow that we added to row 4, since the feedback loop is clearly on row 5.
html = html.replace(
  /<td class=\"flow center\">\s*<svg class=\"flowSvg\" viewBox=\"0 0 104 54\">\s*<!-- Line coming down from Row 3 Kejaksaan, turning right to Rutan -->\s*<line x1=\"52\" y1=\"0\" x2=\"52\" y2=\"27\" stroke=\"#111\" stroke-width=\"1.5\"><\/line>\s*<line x1=\"52\" y1=\"27\" x2=\"104\" y2=\"27\" stroke=\"#111\" stroke-width=\"1.5\"><\/line>\s*<polygon points=\"104,27 97,23 97,31\" fill=\"#111\"><\/polygon>\s*<!-- Return line coming from Rutan \(right\) going left to Panitera -->\s*<line x1=\"104\" y1=\"40\" x2=\"0\" y2=\"40\" stroke=\"#111\" stroke-width=\"1.5\"><\/line>\s*<polygon points=\"0,40 7,36 7,44\" fill=\"#111\"><\/polygon>\s*<\/svg>\s*<\/td>/s,
  `<td class="flow center">
        <svg class="flowSvg" viewBox="0 0 104 54">
            <!-- Line coming down from Row 3 Kejaksaan, turning right to Rutan -->
            <line x1="52" y1="0" x2="52" y2="27" stroke="#111" stroke-width="1.5"></line>
            <line x1="52" y1="27" x2="104" y2="27" stroke="#111" stroke-width="1.5"></line>
            <polygon points="104,27 97,23 97,31" fill="#111"></polygon>
            
            <!-- Left pointing arrow (floating) in Kejaksaan as in image -->
            <line x1="62" y1="40" x2="30" y2="40" stroke="#111" stroke-width="1.5"></line>
            <polygon points="30,40 37,36 37,44" fill="#111"></polygon>
        </svg>
    </td>`
);

// Restore row 4 Panitera
html = html.replace(
  /<td class=\"flow center\">\s*<svg class=\"flowSvg\" viewBox=\"0 0 104 54\">\s*<line x1=\"52\" y1=\"0\" x2=\"52\" y2=\"14\" stroke=\"#111\" stroke-width=\"1.5\"><\/line>\s*<rect x=\"22\" y=\"14\" width=\"60\" height=\"26\" fill=\"none\" stroke=\"#111\" stroke-width=\"1.7\"><\/rect>\s*<line x1=\"52\" y1=\"40\" x2=\"52\" y2=\"54\" stroke=\"#111\" stroke-width=\"1.5\"><\/line>\s*<polygon points=\"52,54 48,47 56,47\" fill=\"#111\"><\/polygon>\s*<!-- Receive line from Kejaksaan -->\s*<line x1=\"104\" y1=\"40\" x2=\"82\" y2=\"40\" stroke=\"#111\" stroke-width=\"1.5\"><\/line>\s*<\/svg>\s*<\/td>/s,
  `<td class="flow center">
        <svg class="flowSvg" viewBox="0 0 104 54">
            <line x1="52" y1="0" x2="52" y2="14" stroke="#111" stroke-width="1.5"></line>
            <rect x="22" y="14" width="60" height="26" fill="none" stroke="#111" stroke-width="1.7"></rect>
            <line x1="52" y1="40" x2="52" y2="54" stroke="#111" stroke-width="1.5"></line>
            <polygon points="52,54 48,47 56,47" fill="#111"></polygon>
        </svg>
    </td>`
);

// Row 4 Rutan shouldn't receive a left line on row 4 bottom, but from row 5
// But wait, the left arrow in Kejaksaan in the image is probably just the "Tidak" path turning left.
// In the image:
// Row 4 Rutan has a box. Line from Kejaksaan enters left side.
// Row 5 Rutan has "Tidak" and line going left.
// The image shows the floating arrow pointing left in Kejaksaan *below* the line that goes right.
// This is because the "Tidak" line is passing through Kejaksaan on its way back to Panitera!
// Wait! If the "Tidak" line goes from Rutan, through Kejaksaan, to Panitera, and it passes under the right-pointing line in Row 4 Kejaksaan, that means the "Tidak" line is actually on row 4, not row 5!
// Look at the diamond in Panitera. The line goes from the diamond, but where?
// No, the image shows:
// Row 4: Panitera (rect) | Kejaksaan (line right, line left below it) | Rutan (rect).
// Row 5: Panitera (diamond) | Kejaksaan (empty?) | Rutan ("Tidak" text? No, maybe the diamond is in Row 5 Panitera).
// Let's look at the labels.
// 4 = "Pengisian checklist...". The image has 3 boxes here. But wait, in the image, the box in Panitera is row 4, box in Kejaksaan is row 3, box in Rutan is row 4.
// Let's re-read the image:
// Row 1: Panitera (oval)
// Row 2: Panitera (rect), line right to Kejaksaan (down arrow)
// Row 3: Panitera (empty? No, line down), Kejaksaan (rect), line down
// Row 4: Panitera (rect), Kejaksaan (line down, turns right to Rutan, AND arrow left), Rutan (rect).
// Row 5: Panitera (diamond, "Ya" down, left arrow coming INTO it from the right), Rutan ("Tidak").
// So the line coming from Rutan goes left on row 5, entering the diamond on the right side!

fs.writeFileSync('./docs/sop-format-siappakai.html', html);
