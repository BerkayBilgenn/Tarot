'use strict';
const http = require('node:http'), fs = require('node:fs/promises'), path = require('node:path'), crypto = require('node:crypto'), zlib = require('node:zlib');
const {promisify} = require('node:util');
const config = require('../vercel.json');
const {createHandler} = require('../server/oracle-handler.js');
const gzip = promisify(zlib.gzip), brotli = promisify(zlib.brotliCompress);
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.ico':'image/x-icon','.jpg':'image/jpeg','.woff':'font/woff','.woff2':'font/woff2'};
function createServer({root = path.resolve(__dirname,'../dist'), handler = createHandler()} = {}) {
  return http.createServer(async(req,res) => {
    for (const header of config.headers[0].headers) res.setHeader(header.key,header.value);
    let pathname, requestUrl;
    try { requestUrl = new URL(req.url,'http://localhost'); pathname = decodeURIComponent(requestUrl.pathname); }
    catch { res.writeHead(400);res.end();return; }
    if (pathname === '/api/closing') { await handler(req,res); return; }
    if (!['GET','HEAD'].includes(req.method)) { res.setHeader('Allow','GET, HEAD');res.writeHead(405);res.end();return; }
    let file = path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if (!file.startsWith(root+path.sep) || pathname.split('/').some(part=>part.startsWith('.'))) { res.writeHead(404);res.end();return; }
    try {
      if ((await fs.stat(file)).isDirectory()) {
        file = path.join(file,'index.html');
        await fs.access(file);
        if (!pathname.endsWith('/')) {
          res.setHeader('Location',requestUrl.pathname+'/'+requestUrl.search);
          res.writeHead(308);res.end();return;
        }
      }
      const data = await fs.readFile(file);
      const ext = path.extname(file), etag = '"'+crypto.createHash('sha256').update(data).digest('hex').slice(0,24)+'"';
      res.setHeader('Content-Type',types[ext] || 'application/octet-stream');
      res.setHeader('ETag',etag);res.setHeader('Vary','Accept-Encoding');
      res.setHeader('Cache-Control',pathname.startsWith('/assets/')?'public, max-age=86400, must-revalidate':'public, max-age=0, must-revalidate');
      if (req.headers['if-none-match'] === etag) {res.writeHead(304);res.end();return;}
      let payload = data;
      if (data.length > 1024 && ['.html','.css','.js','.svg','.xml','.txt'].includes(ext)) {
        if (/\bbr\b/.test(req.headers['accept-encoding'] || '')) {payload=await brotli(data);res.setHeader('Content-Encoding','br');}
        else if (/\bgzip\b/.test(req.headers['accept-encoding'] || '')) {payload=await gzip(data);res.setHeader('Content-Encoding','gzip');}
      }
      res.setHeader('Content-Length',payload.length);res.writeHead(200);res.end(req.method==='HEAD'?undefined:payload);
    } catch { res.writeHead(404);res.end(); }
  });
}
if (require.main === module) createServer().listen(Number(process.env.PORT || 8769),'127.0.0.1',()=>console.log('Release preview ready'));
module.exports = {createServer};
