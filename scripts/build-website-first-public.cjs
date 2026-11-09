'use strict';
// TradeBridge Option A static PUBLIC artifact builder. SOURCE-ONLY; NO DEPLOYMENT.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.TRADEBRIDGE_OPTION_A_PUBLIC_OUTPUT_DIR||path.join(root,'.vercel','output'));
const staticDir=path.join(out,'static'),domain='https://tradebridgeintelligence.com';
if(process.env.TRADEBRIDGE_BUILD_TARGET!=='production')throw Error('Public artifact requires TRADEBRIDGE_BUILD_TARGET=production');
for(const key of ['TRADEBRIDGE_INTAKE_API_BASE_URL','TRADEBRIDGE_TURNSTILE_SITEKEY','TRADEBRIDGE_GA4_MEASUREMENT_ID','OPPORTUNITY_DESK_WEBHOOK_URL','UPSTASH_REDIS_REST_URL'])
  if(String(process.env[key]||'').trim())throw Error('Deferred feature configuration forbidden: '+key);
if(out===root||root.startsWith(out+path.sep)||out===path.parse(out).root)throw Error('Unsafe output location');
const pages=[
'index.html','404.html','about/index.html','accessibility/index.html',
'business-operations/index.html','commercial-intelligence/index.html',
'how-tradebridge-works/index.html','insights/index.html',
'insights/disconnected-workflows/index.html','insights/selective-ownership/index.html',
'insights/the-tradebridge-standard/index.html','intake-received/index.html',
'newsletter-confirmation/index.html','privacy/index.html','start/index.html','ventures/index.html'];
const assets=['robots.txt','sitemap.xml','tradebridge-logo-nav.png','tradebridge-logo-full.png',
'assets/original-globe.png','assets/site.css','assets/site.js'];
const retired=new Set(['intake-received/index.html','newsletter-confirmation/index.html']);
const indexable=pages.filter(p=>p!=='404.html'&&!retired.has(p));
const urlFor=p=>p==='index.html'?'/':'/'+p.slice(0,-'index.html'.length);
const copy=p=>{const dst=path.join(staticDir,p);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(path.join(root,p),dst)};
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(staticDir,{recursive:true});
for(const a of assets)copy(a);
for(const p of pages){
 let html=fs.readFileSync(path.join(root,p),'utf8');
 const meta=/<meta\s+name=["']robots["']\s+content=["'][^"']*["']\s*\/?\s*>/i;
 if(retired.has(p)){if(!meta.test(html))throw Error('Missing retired-route noindex '+p);
   html=html.replace(meta,'<meta name="robots" content="noindex">');}
 else if(meta.test(html))throw Error('Indexable content contains robots policy: '+p);
 if(/\b(?:nofollow|noarchive)\b/i.test(html))throw Error('Review-only robot directive in '+p);
 for(const [name,re] of [
  ['form',/<form(?:\s|>)/i],['form field',/<(?:input|textarea|select)(?:\s|>)/i],
  ['submit',/<button[^>]+type=["']submit/i],
  ['remote script',/<script[^>]+src=["']https?:\/\//i],
  ['Turnstile',/challenges\.cloudflare\.com|cf-turnstile/i],
  ['analytics',/googletagmanager\.com|gtag\s*\(/i]
 ])if(re.test(html))throw Error('Deferred public component '+name+' in '+p);
 const canonical=(html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)||[])[1];
 if(canonical!==domain+urlFor(p))throw Error('Unexpected canonical '+p);
 const dst=path.join(staticDir,p);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.writeFileSync(dst,html);
}
const js=fs.readFileSync(path.join(staticDir,'assets/site.js'),'utf8');
for(const re of [/sessionStorage|localStorage|indexedDB/i,/\bfetch\s*\(|XMLHttpRequest|WebSocket/i,
 /\/api\/intake|\/v1\/intake|turnstile/i,/newsletter_consent|CustomEvent|tradebridgeTrack|dataLayer|gtag\s*\(/i])
 if(re.test(js))throw Error('Deferred browser behavior found');
fs.writeFileSync(path.join(staticDir,'assets/site-config.js'),
 'window.TRADEBRIDGE_CONFIG=Object.freeze({mode:"email-only-public"});\n');
const start=fs.readFileSync(path.join(staticDir,'start/index.html'),'utf8');
const privacy=fs.readFileSync(path.join(staticDir,'privacy/index.html'),'utf8');
if(!start.includes('mailto:jnichols@tradebridgeintelligence.com')||!privacy.includes('Google Workspace'))throw Error('Email/privacy route missing');
for(const id of ['commercial-intelligence','business-operations','ventures'])
 if(!start.includes('id="'+id+'"'))throw Error('Missing division anchor '+id);
const robots=fs.readFileSync(path.join(staticDir,'robots.txt'),'utf8');
if(!robots.includes('Allow: /')||robots.includes('Disallow: /')||!robots.includes(domain+'/sitemap.xml'))throw Error('Public robots not indexable');
const sitemap=fs.readFileSync(path.join(staticDir,'sitemap.xml'),'utf8');
const locs=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
if(locs.length!==indexable.length||new Set(locs).size!==locs.length||indexable.some(p=>!locs.includes(domain+urlFor(p))))
 throw Error('Public sitemap mismatch');
const allow=new Set([...pages,...assets,'assets/site-config.js']);
for(const p of pages){
 const html=fs.readFileSync(path.join(staticDir,p),'utf8');
 for(const m of html.matchAll(/\b(?:href|src)=["'](\/(?!\/)[^"']*)["']/g)){
  const target=m[1].split(/[?#]/)[0];if(!target)continue;
  const rel=target==='/'?'index.html':target.endsWith('/')?target.slice(1)+'index.html':target.slice(1);
  if(!allow.has(rel))throw Error('Broken local path '+m[1]+' in '+p);
 }
}
for(const p of indexable)if(/<meta\s+name=["']robots["'][^>]*>/i.test(fs.readFileSync(path.join(staticDir,p),'utf8')))
 throw Error('Unexpected indexability block '+p);
const headers={'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin',
 'X-Frame-Options':'DENY','Permissions-Policy':'camera=(), microphone=(), geolocation=()',
 'Strict-Transport-Security':'max-age=31536000; includeSubDomains'};
const routes=[{src:'^/(.*)$',headers,continue:true},
 {src:'^/(?:api|intake-service)(?:/.*)?$',dest:'/404.html',status:404},
 {src:'^/$',dest:'/index.html'}];
for(const p of pages.filter(x=>x.endsWith('/index.html'))){
 const slug=p.slice(0,-'/index.html'.length);
 routes.push({src:'^/'+slug+'$',status:308,headers:{Location:'/'+slug+'/'}});
 routes.push({src:'^/'+slug+'/$',dest:'/'+p});
}
routes.push({handle:'filesystem'},{src:'^/.*$',dest:'/404.html',status:404});
const config={version:3,routes};
if(JSON.stringify(config).includes('X-Robots-Tag'))throw Error('Global noindex header forbidden');
fs.writeFileSync(path.join(out,'config.json'),JSON.stringify(config,null,2)+'\n');
if(fs.existsSync(path.join(out,'functions'))||fs.existsSync(path.join(staticDir,'api'))||pages.length!==16)throw Error('Nonstatic or route-count violation');
const hash=crypto.createHash('sha256').update(fs.readFileSync(path.join(out,'config.json'))).digest('hex');
console.log(JSON.stringify({classification:'OPTION_A_PUBLIC_RELEASE_SOURCE_ONLY',
 deploymentAuthorized:false,htmlRoutes:pages.length,indexableRoutes:indexable.length,deferredApiFunctions:0,
 publicStaticFiles:allow.size,robotsAllowsIndexing:true,configSHA256:hash},null,2));
