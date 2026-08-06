const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('./docs/sop-format-siappakai.html', 'utf8');
const $ = cheerio.load(html);

// We need to add multiple roles. From sop.md, under "Pelaksana":
// 1. Panitera / Operator CIMS
// 2. Kejaksaan
// 3. Rutan/Lapas
// Wait, the user mentioned "Hakim" is missing.
// Let's look at sop.md:
// "Hakim / Majelis Hakim" -> Aktivitas 2 (Penjadwalan), 6 (Buka Sidang), 8 (Baca putusan)
// Let's read sop.md to get the full list of Pelaksana in the main steps.
