import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
const file = process.argv[2];
if (!file) throw new Error('Usage: node tools/verify-evidence-package.mjs <evidence.json>');
const value = JSON.parse(readFileSync(file,'utf8'));
function canonicalJson(input){
  if(Array.isArray(input)) return `[${input.map(canonicalJson).join(',')}]`;
  if(input && typeof input==='object') return `{${Object.keys(input).sort().map((key)=>`${JSON.stringify(key)}:${canonicalJson(input[key])}`).join(',')}}`;
  return JSON.stringify(input);
}
const hash=(input)=>createHash('sha256').update(canonicalJson(input)).digest('hex');
const sections = new Map((value.sections ?? []).map((section)=>[section.category,section.data]));
const failures=[];
for(const item of value.manifest?.items ?? []){
  const actual=hash(sections.get(item.category));
  if(actual!==item.contentHash) failures.push({category:item.category,expected:item.contentHash,actual});
}
const manifestHash=hash(value.manifest);
if(manifestHash!==value.manifest_hash) failures.push({category:'MANIFEST',expected:value.manifest_hash,actual:manifestHash});
if(failures.length){console.error(JSON.stringify({status:'FAIL',failures},null,2));process.exit(1)}
console.log(JSON.stringify({status:'PASS',manifest_hash:manifestHash,item_count:value.manifest.items.length},null,2));
