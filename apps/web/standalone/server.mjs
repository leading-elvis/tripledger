import { createServer } from 'node:http';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { handleApi } from '../lib/api.mjs';
import { openStorage } from './storage.mjs';
import { LIMITS } from '../lib/domain.mjs';

const password=process.env.TRIPLEDGER_PASSWORD;
if(!password || password.length<12)throw new Error('Set TRIPLEDGER_PASSWORD to at least 12 characters before starting.');
const port=Number(process.env.PORT??4180),host=process.env.HOST??'127.0.0.1';
const origin=process.env.PUBLIC_ORIGIN??`http://127.0.0.1:${port}`;
if(host!=='127.0.0.1' && !process.env.PUBLIC_ORIGIN)throw new Error('PUBLIC_ORIGIN is required for a non-loopback bind.');
const originUrl=new URL(origin);const secure=originUrl.protocol==='https:';
const salt=randomBytes(32),passwordHash=scryptSync(password,salt,32);delete process.env.TRIPLEDGER_PASSWORD;
const storage=openStorage(process.env.DATA_DIR??fileURLToPath(new URL('../.data',import.meta.url)));
const assets=fileURLToPath(new URL('../dist-standalone',import.meta.url));
if(!existsSync(resolve(assets,'index.html')))throw new Error('Build standalone UI first. See SELF_HOSTING.md.');
const sessions=new Map(),attempts=new Map();
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.woff2':'font/woff2'};
const cookie=value=>`tripledger_session=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${secure?'; Secure':''}`;
async function readBody(req,max=LIMITS.bodyBytes){const chunks=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>max)throw new Error('Request too large');chunks.push(chunk);}return Buffer.concat(chunks);}
const server=createServer(async(req,res)=>{
  try {
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');res.setHeader('Cache-Control','no-store');
    if(req.headers.host!==originUrl.host){res.writeHead(403).end('Unexpected host');return;}
    const url=new URL(req.url,origin);if(!['GET','HEAD'].includes(req.method) && req.headers.origin && req.headers.origin!==origin){res.writeHead(403).end('Invalid origin');return;}
    const token=/\btripledger_session=([a-f0-9]{64})\b/.exec(req.headers.cookie??'')?.[1];
    const authenticated=token && (sessions.get(token)??0)>Date.now();
    if(url.pathname==='/api/login' && req.method==='POST') {
      const address=req.socket.remoteAddress??'local';const now=Date.now(),recent=(attempts.get(address)??[]).filter(time=>now-time<600000);
      if(recent.length>=10){res.writeHead(429,{'Content-Type':'application/json'}).end(JSON.stringify({error:'嘗試次數過多，請 10 分鐘後再試'}));return;}
      attempts.set(address,[...recent,now]);const input=JSON.parse((await readBody(req,4096)).toString());
      const candidate=typeof input.password==='string'&&input.password.length<=256?input.password:'';
      if(!timingSafeEqual(passwordHash,scryptSync(candidate,salt,32))){res.writeHead(401,{'Content-Type':'application/json'}).end(JSON.stringify({error:'密碼不正確',mode:'standalone'}));return;}
      const session=randomBytes(32).toString('hex');sessions.set(session,Date.now()+43200000);attempts.delete(address);for(const [key,expires] of sessions)if(expires<now)sessions.delete(key);
      res.writeHead(200,{'Content-Type':'application/json','Set-Cookie':cookie(session)}).end('{"ok":true}');return;
    }
    if(url.pathname.startsWith('/api/')) {
      const request=new Request(url,{method:req.method,headers:new Headers(Object.entries(req.headers).filter(([,v])=>v!==undefined).map(([k,v])=>[k,Array.isArray(v)?v.join(','):v])),...(!['GET','HEAD'].includes(req.method)?{body:await readBody(req)}:{})});
      const response=await handleApi(request,{...storage,subject:authenticated?'local-owner':null,mode:'standalone'});
      res.writeHead(response.status,Object.fromEntries(response.headers));if(response.body)Readable.fromWeb(response.body).pipe(res);else res.end();return;
    }
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
    const path=resolve(assets,decodeURIComponent(url.pathname).replace(/^\//,''));
    if(!path.startsWith(assets+sep)&&path!==assets){res.writeHead(404).end();return;}
    const file=existsSync(path)&&statSync(path).isFile()?path:resolve(assets,'index.html');res.writeHead(200,{'Content-Type':types[extname(file)]??'application/octet-stream'});res.end(req.method==='HEAD'?undefined:readFileSync(file));
  }catch(error){console.error('Request failed:',error.message);if(!res.headersSent)res.writeHead(400,{'Content-Type':'application/json'});res.end('{"error":"無法處理此請求"}');}
});
server.listen(port,host,()=>console.log(`TripLedger independent server: ${origin}`));
function stop(){server.close(()=>{storage.close();process.exit(0);});}
process.on('SIGTERM',stop);process.on('SIGINT',stop);
