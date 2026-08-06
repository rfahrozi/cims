const fs = require('fs');
let html = fs.readFileSync('./docs/sop-format-siappakai.html', 'utf8');

// Row 5 Kejaksaan issue in image:
// The decision diamond from Panitera "Ya" goes down.
// The decision diamond from Panitera "Tidak" goes right. But wait, in the image, Panitera Diamond: "Ya" goes down.
// "Tidak" (although not explicitly labelled in Panitera) goes right to Kejaksaan, then to Rutan/Lapas?
// No, looking closely at the image:
// Row 5 Panitera: Diamond. "Ya" goes down. Right arrow goes to Kejaksaan, then to Rutan/Lapas.
// Row 5 Rutan/Lapas: Has a text "Tidak" and an arrow pointing down from the rect above, then going left.
// Wait, the original HTML has the diamond in Panitera, right line goes through Kejaksaan, then Rutan/Lapas has text "Tidak".
// Let's re-examine the image.
// Row 5 Panitera: Diamond. Arrow down labeled "Ya". Arrow right to Kejaksaan.
// Row 5 Kejaksaan: Line goes right.
// Row 5 Rutan/Lapas: Text "Tidak". Line from above (Row 4 Rutan) goes down to text "Tidak", then turns left, goes back through Kejaksaan to Panitera? No, that's what we just drew in Row 4!

// Let's look at the original provided image VERY CAREFULLY.
// Row 4:
// - Panitera: Rect. Arrow down.
// - Kejaksaan: Arrow down from row 3 Kejaksaan rect. Then turns RIGHT, pointing into Row 4 Rutan rect.
//   AND there is a standalone arrow pointing LEFT.
// - Rutan/Lapas: Rect. Receiving from left.
// Row 5:
// - Panitera: Diamond. Arrow down labeled "Ya". Arrow right.
// - Kejaksaan: Line from left to right.
// - Rutan/Lapas: Arrow down from Row 4 Rutan rect. Label "Tidak" below it. Then the line turns LEFT, goes through Kejaksaan, to Panitera diamond?
// Wait, if Rutan line goes down, turns left, then goes through Kejaksaan to Panitera, that's Row 5!
// And the diamond in Panitera Row 5 receives from the RIGHT? Yes, the line goes left into the diamond.
// Let's rewrite Row 5 based on this.

html = html.replace(
  /<td class=\"flow center\">\s*<svg class=\"flowSvg\" viewBox=\"0 0 104 54\">\s*<line x1=\"52\" y1=\"0\" x2=\"52\" y2=\"10\" stroke=\"#111\" stroke-width=\"1.5\"><\/line>\s*<polygon points=\"52,10 76,27 52,44 28,27\" fill=\"none\" stroke=\"#111\" stroke-width=\"1.7\"><\/polygon>\s*<text x=\"36\" y=\"21\" font-size=\"9\" font-weight=\"bold\" fill=\"#111\">Ya<\/text>\s*<line x1=\"52\" y1=\"44\" x2=\"52\" y2=\"54\" stroke=\"#111\" stroke-width=\"1.5\"><\/line>\s*<polygon points=\"52,54 48,47 56,47\" fill=\"#111\"><\/polygon>\s*<line x1=\"76\" y1=\"27\" x2=\"104\" y2=\"27\" stroke=\"#111\" stroke-width=\"1.5\"><\/line>\s*<polygon points=\"104,27 97,23 97,31\" fill=\"#111\"><\/polygon>\s*<\/svg>\s*<\/td>/s,
  `<td class="flow center">
        <svg class="flowSvg" viewBox="0 0 104 54">
            <line x1="52" y1="0" x2="52" y2="10" stroke="#111" stroke-width="1.5"></line>
            <polygon points="52,10 76,27 52,44 28,27" fill="none" stroke="#111" stroke-width="1.7"></polygon>
            <text x="36" y="21" font-size="9" fill="#111">Ya</text>
            <line x1="52" y1="44" x2="52" y2="54" stroke="#111" stroke-width="1.5"></line>
            <polygon points="52,54 48,47 56,47" fill="#111"></polygon>
            <!-- Line coming in from right (from Kejaksaan) -->
            <line x1="104" y1="27" x2="76" y2="27" stroke="#111" stroke-width="1.5"></line>
            <polygon points="76,27 83,23 83,31" fill="#111"></polygon>
        </svg>
    </td>`
);

html = html.replace(
  /<td class=\"flow center\">\s*<svg class=\"flowSvg\" viewBox=\"0 0 104 54\">\s*<line x1=\"0\" y1=\"27\" x2=\"104\" y2=\"27\" stroke=\"#111\" stroke-width=\"1.5\"><\/line>\s*<polygon points=\"104,27 97,23 97,31\" fill=\"#111\"><\/polygon>\s*<\/svg>\s*<\/td>/s,
  `<td class="flow center">
        <svg class="flowSvg" viewBox="0 0 104 54">
            <line x1="104" y1="27" x2="0" y2="27" stroke="#111" stroke-width="1.5"></line>
        </svg>
    </td>`
);

html = html.replace(
  /<td class=\"flow center\">\s*<svg class=\"flowSvg\" viewBox=\"0 0 104 54\">\s*<line x1=\"52\" y1=\"0\" x2=\"52\" y2=\"27\" stroke=\"#111\" stroke-width=\"1.5\"><\/line>\s*<line x1=\"52\" y1=\"27\" x2=\"0\" y2=\"27\" stroke=\"#111\" stroke-width=\"1.5\"><\/line>\s*<text x=\"38\" y=\"21\" font-size=\"9\" font-weight=\"bold\" fill=\"#111\">Tidak<\/text>\s*<polygon points=\"52,0 48,7 56,7\" fill=\"#111\"><\/polygon>\s*<\/svg>\s*<\/td>/s,
  `<td class="flow center">
        <svg class="flowSvg" viewBox="0 0 104 54">
            <!-- Line coming down from Row 4 Rutan -->
            <line x1="52" y1="0" x2="52" y2="27" stroke="#111" stroke-width="1.5"></line>
            <line x1="52" y1="27" x2="0" y2="27" stroke="#111" stroke-width="1.5"></line>
            <text x="44" y="40" font-size="9" fill="#111">Tidak</text>
        </svg>
    </td>`
);

fs.writeFileSync('./docs/sop-format-siappakai.html', html);
