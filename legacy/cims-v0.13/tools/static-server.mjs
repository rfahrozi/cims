import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.argv[2]||'.'); const port=Number(process.argv[3]||4173);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};
http.createServer((req,res)=>{let u=decodeURIComponent((req.url||'/').split('?')[0]); if(u==='/')u='/index.html'; const f=path.resolve(root,'.'+u); if(!f.startsWith(root)){res.writeHead(403);return res.end('Forbidden')} fs.readFile(f,(e,b)=>{if(e){res.writeHead(404);return res.end('Not found')}res.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream'});res.end(b)});}).listen(port,()=>console.log(`Static server: http://localhost:${port}`));
