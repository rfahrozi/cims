
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const excluded=new Set(['node_modules','.git','dist']); const files=[];
function walk(dir){for(const name of readdirSync(dir)){if(excluded.has(name))continue;const p=path.join(dir,name);if(statSync(p).isDirectory())walk(p);else if(p!=='RELEASE_MANIFEST_SHA256.txt')files.push(p)}}
walk('.'); files.sort(); const lines=files.map((file)=>`${createHash('sha256').update(readFileSync(file)).digest('hex')}  ${file.replace(/^\.\//,'')}`);writeFileSync('RELEASE_MANIFEST_SHA256.txt',lines.join('\n')+'\n');console.log(`Created manifest for ${files.length} files`);
