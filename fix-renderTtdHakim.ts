import fs from 'fs';

const filePath = 'apps/api/src/modules/appeal-decision/penetapan-document.service.ts';
let content = fs.readFileSync(filePath, 'utf8');

// The code uses renderTtdHakim but the actual function is renderTtdBlock which only takes 2 parameters
// Let's replace the usages
content = content.replace(
  /\$\{this\.renderTtdHakim\(penetapanCity, formattedDate, hakimKetua\)\}/g,
  '${this.renderTtdBlock(penetapanCity, hakimKetua)}'
);

fs.writeFileSync(filePath, content);
