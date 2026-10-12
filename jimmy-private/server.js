'use strict';
/* Protected, independent TradeBridge Tradewinds v0.60.20 buyer review.
 * The ciphertext payload is safe to keep in Git, but the decryption key,
 * login password and cookie-signing secret must exist only as Render env vars.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');

const PASSWORD = process.env.DEMO_PASSWORD;
const SESSION_SECRET = process.env.SESSION_SECRET;
const ENC_KEY = process.env.PAYLOAD_KEY_B64;
if (!PASSWORD || PASSWORD.length < 18 || !SESSION_SECRET || !ENC_KEY) {
  console.error('Required secret configuration is missing.');
  process.exit(1);
}
const key = Buffer.from(ENC_KEY, 'base64');
if (key.length !== 32) throw new Error('Encryption key length invalid.');
let HTML;
try {
  const payload = Buffer.from(fs.readFileSync(path.join(__dirname,'payload.b64'),'utf8').trim(), 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, payload.subarray(0,12));
  decipher.setAAD(Buffer.from('tradebridge-jimmy-private-v06020'));
  decipher.setAuthTag(payload.subarray(payload.length-16));
  const gzipBytes = Buffer.concat([decipher.update(payload.subarray(12,payload.length-16)),decipher.final()]);
  HTML = zlib.gunzipSync(gzipBytes);
  if (!HTML.toString('utf8',0,128).includes('<!doctype html>')) throw new Error('App payload invalid.');
} catch (e) {
  console.error('Unable to load protected app payload.');
  process.exit(1);
}
const COOKIE='tw_jimmy_review';
const TTL=60*60*24*7;
function signature(exp) { return crypto.createHmac('sha256',SESSION_SECRET).update('jimmy-review-v1:'+exp).digest('hex'); }
function constantEqual(a,b) {
  const ah=crypto.createHash('sha256').update(String(a)).digest();
  const bh=crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ah,bh);
}
function sessionValid(req) {
  const cookies=String(req.headers.cookie||'').split(';');
  const value=cookies.map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='));
  if(!value)return false;
  const m=value.slice(COOKIE.length+1).match(/^(\d{10,11})\.([a-f0-9]{64})$/);
  if(!m)return false;
  const exp=Number(m[1]);
  return Number.isSafeInteger(exp) && exp>Date.now()/1000 && constantEqual(m[2],signature(exp));
}
const HEADERS={
  'Cache-Control':'no-store, max-age=0',
  'Pragma':'no-cache',
  'Referrer-Policy':'no-referrer',
  'X-Content-Type-Options':'nosniff',
  'X-Frame-Options':'DENY',
  'Cross-Origin-Resource-Policy':'same-origin',
  'Content-Security-Policy':"frame-ancestors 'none'; base-uri 'none'",
  'Permissions-Policy':'geolocation=(), camera=(), microphone=()'
};
function reply(res,status,contentType,content='',extra={}) {
  res.writeHead(status,{...HEADERS,'Content-Type':contentType,...extra});
  res.end(content);
}
function redirect(res,dest,extra={}) { reply(res,303,'text/plain; charset=utf-8','Redirecting',{Location:dest,...extra}); }
function loginPage(error=false) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tradewinds | Jimmy's Private Review</title><style>
  *{box-sizing:border-box}body{margin:0;min-height:100vh;background:#edf2f6;color:#173452;font-family:Arial,Helvetica,sans-serif;display:flex;align-items:center;justify-content:center;padding:24px}.card{width:min(100%,440px);padding:32px;background:#fff;border-radius:12px;box-shadow:0 10px 50px #142d4930}.eyebrow{font-size:12px;letter-spacing:1.4px;font-weight:800;color:#3b657f;text-transform:uppercase}h1{margin:10px 0 8px;font-size:28px}p{font-size:14px;line-height:1.5;color:#4c6172}label{display:block;margin:24px 0 8px;font-size:13px;font-weight:700}input{width:100%;padding:14px;border:1px solid #afc1ce;border-radius:7px;font:inherit;font-size:16px}button{width:100%;background:#176193;color:#fff;border:0;border-radius:7px;font-size:16px;font-weight:700;padding:14px;margin-top:14px;cursor:pointer}.error{background:#fff0ef;color:#8d2621;padding:11px;margin:16px 0;border-radius:6px;font-size:13px}small{display:block;margin-top:20px;color:#5f7486;line-height:1.5}
  </style></head><body><main class="card"><div class="eyebrow">TradeBridge · Tradewinds</div><h1>Private Review</h1><p>Enter your access password to open the complete Tradewinds operations review workspace.</p>${error?'<div class="error" role="alert">That password was not accepted. Please try again.</div>':''}<form method="POST" action="/login" autocomplete="off"><label for="pass">Review password</label><input id="pass" name="password" type="password" required autofocus autocomplete="off"><button type="submit">Open Tradewinds</button></form><small>This is an independent review copy. Changes on this device do not update Tradewinds or other devices. No emails or outside transactions are sent.</small></main></body></html>`;
}
const attempts=new Map();
function ipFor(req) {
  // Render is trusted to set the real client address; don't trust user-supplied inputs for authorization.
  const forwarded=String(req.headers['x-forwarded-for']||'').split(',')[0].trim();
  return forwarded||req.socket.remoteAddress||'unknown';
}
function rateCheck(req){
 const k=ipFor(req),now=Date.now();let a=attempts.get(k);
 if(!a||now-a.since>60000){a={since:now,n:0};attempts.set(k,a)}
 a.n++;
 if(attempts.size>5000)attempts.clear();
 return a.n<=12;
}
const server=http.createServer((req,res)=>{
  const url=new URL(req.url||'/', 'http://local.invalid');
  if(url.pathname==='/healthz' && (req.method==='GET'||req.method==='HEAD')) return reply(res,200,'text/plain; charset=utf-8','ok');
  if(url.pathname==='/robots.txt') return reply(res,200,'text/plain; charset=utf-8','User-agent: *\nDisallow: /\n');
  if(url.pathname==='/login' && req.method==='GET'){
    if(sessionValid(req))return redirect(res,'/');
    return reply(res,200,'text/html; charset=utf-8',loginPage());
  }
  if(url.pathname==='/login' && req.method==='POST'){
    let data='';
    req.on('data',chunk=>{data+=chunk;if(data.length>2048)req.destroy()});
    req.on('end',()=>{
      if(!rateCheck(req))return reply(res,429,'text/html; charset=utf-8','Too many attempts. Try again in one minute.',{'Retry-After':'60'});
      const password=new URLSearchParams(data).get('password')||'';
      if(!constantEqual(password,PASSWORD))return reply(res,401,'text/html; charset=utf-8',loginPage(true));
      const exp=Math.floor(Date.now()/1000)+TTL;
      const val=exp+'.'+signature(exp);
      return redirect(res,'/',{'Set-Cookie':`${COOKIE}=${val}; Max-Age=${TTL}; Path=/; HttpOnly; Secure; SameSite=Strict`});
    });
    return;
  }
  if(url.pathname==='/logout')return redirect(res,'/login',{'Set-Cookie':`${COOKIE}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict`});
  if(!sessionValid(req))return redirect(res,'/login');
  if(url.pathname==='/' && req.method==='GET')return reply(res,200,'text/html; charset=utf-8',HTML);
  if(url.pathname.startsWith('/api/'))return reply(res,403,'application/json; charset=utf-8','{"error":"External operations are disabled in this independent review copy"}');
  return reply(res,404,'text/plain; charset=utf-8','Not found');
});
const port=Number(process.env.PORT)||10000;
server.listen(port,'0.0.0.0',()=>console.log('Protected Tradewinds review server ready on port '+port));
