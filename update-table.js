const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('./docs/sop-format-siappakai.html', 'utf8');
const $ = cheerio.load(html);

// Find the main process table
const theadRow2 = $('.process tr').eq(1);
const thKejaksaan = theadRow2.find('th').filter((i, el) => $(el).text() === 'Kejaksaan');

// In sop.md, we see these main actors mapped:
// 1. Hakim (Hakim / Majelis Hakim)
// 2. Sistem CIMS (Sistem CIMS / Admin / Operator IT)
// The HTML currently has 3 columns: Panitera/Operator CIMS, Kejaksaan, Rutan/Lapas.
// We need to add Hakim and Sistem CIMS.
// So let's make it 5 columns for Pelaksana:
// Hakim | Panitera / Operator CIMS | Sistem CIMS | Kejaksaan | Rutan/Lapas

// 1. Update the 'Pelaksana' colspan from 3 to 5
$('.process tr').eq(0).find('th').eq(2).attr('colspan', '5');

// 2. Add 'Hakim' and 'Sistem CIMS' to the table headers in Row 2
// Existing: Panitera / Operator CIMS | Kejaksaan | Rutan/Lapas
// We'll insert Hakim before Panitera, and Sistem CIMS after Panitera
const paniteraTh = theadRow2
  .find('th')
  .filter((i, el) => $(el).text() === 'Panitera / Operator CIMS');
$('<th style="width: 80px;">Hakim</th>').insertBefore(paniteraTh);
$('<th style="width: 80px;">Sistem CIMS</th>').insertAfter(paniteraTh);

// Also need to adjust the width in CSS since we are adding more columns
const styleNode = $('style');
if (styleNode.length > 0) {
  styleNode.text(
    styleNode.text().replace('width:104px', 'width:80px').replace('width:104px', 'width:80px')
  );
}

// 3. Update the rows with the new columns
const tbodyRows = $('.process tr').slice(2);

tbodyRows.each((index, element) => {
  const $row = $(element);

  // Create new empty cells for Hakim and Sistem CIMS
  const emptyFlowCell = '<td class="flow center"></td>';

  // We insert Hakim before Panitera (which is index 2)
  $(emptyFlowCell).insertBefore($row.find('td').eq(2));

  // The panitera cell is now index 3. We insert Sistem CIMS after it.
  $(emptyFlowCell).insertAfter($row.find('td').eq(3));
});

// Write it back
fs.writeFileSync('./docs/sop-format-siappakai.html', $.html());
