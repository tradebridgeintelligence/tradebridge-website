'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
const script=path.join(root,'scripts/build-website-first-public.cjs');
const pages=['index.html','404.html','about/index.html','accessibility/index.html',
'business-operations/index.html','commercial-intelligence/index.html',
'how-tradebridge-works/index.html','insights/index.html',
'insights/disconnected-workflows/index.html','insights/selective-ownership/index.html',
'insights/the-tradebridge-standard/index.html','intake-received/index.html',
'newsletter-confirmation/index.html','privacy/index.html','start/index.html','ventures/index.html'];
const retired=new Set(['intake-received/index.html','newsletter-confirmation/index.html']);
function build(extra={}){
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'tb-public-a-')),out=path.join(tmp,'output');
 const env={...process.env,TRADEBRIDGE_BUILD_TARGET:'production',TRADEBRIDGE_OPTION_A_PUBLIC_OUTPUT_DIR:out,
 TRADEBRIDGE_INTAKE_API_BASE_URL:'',TRADEBRIDGE_TURNSTILE_SITEKEY:'',
 TRADEBRIDGE_GA4_MEASUREMENT_ID:'',OPPORTUNITY_DESK_WEBHOOK_URL:'',
 UPSTASH_REDIS_REST_URL:'',...extra};
 const proc=cp.spawnSync(process.execPath,[script],{encoding:'utf8',env});
 return {out,tmp,proc,read:p=>fs.readFileSync(path.join(out,p),'utf8'),
 close:()=>fs.rmSync(tmp,{recursive:true,force:true})};
}
function allFiles(dir){const found=[];function walk(d){for(const f of fs.readdirSync(d,{withFileTypes:true})){
 const full=path.join(d,f.name);if(f.isDirectory())walk(full);else found.push(path.relative(dir,full).split(path.sep).join('/'));
}}walk(dir);return found.sort()}
function withBuild(fn){const b=build();try{assert.equal(b.proc.status,0,b.proc.stderr);fn(b)}finally{b.close()}}

test('public artifact: Build Output API v3 and exactly 16 static HTML pages',()=>withBuild(b=>{
 const report=JSON.parse(b.proc.stdout),cfg=JSON.parse(b.read('config.json'));
 assert.equal(cfg.version,3);assert.equal(report.htmlRoutes,16);assert.equal(report.indexableRoutes,13);
 assert.equal(report.deferredApiFunctions,0);assert.equal(report.deploymentAuthorized,false);
 assert.equal(report.classification,'OPTION_A_PUBLIC_RELEASE_SOURCE_ONLY');
 assert.deepEqual(allFiles(path.join(b.out,'static')).filter(p=>p.endsWith('.html')),pages.slice().sort());
 assert.equal(fs.existsSync(path.join(b.out,'functions')),false);
 assert.equal(fs.existsSync(path.join(b.out,'static','api')),false);
}));
test('public HTML unchanged except the two retired routes keep explicit noindex only',()=>withBuild(b=>{
 for(const p of pages){const h=b.read('static/'+p);
  if(retired.has(p)){assert.match(h,/<meta name="robots" content="noindex">/);
   assert.doesNotMatch(h,/\b(?:nofollow|noarchive)\b/i,p)}
  else{assert.equal(h,fs.readFileSync(path.join(root,p),'utf8'),p+' source content changed');
   assert.doesNotMatch(h,/<meta[^>]*name=["']robots["']/i,p)}
 }
}));
test('13 sitemap URLs exactly match canonical URLs for intended indexable pages',()=>withBuild(b=>{
 const sitemap=b.read('static/sitemap.xml');
 const locs=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
 assert.equal(locs.length,13);assert.equal(new Set(locs).size,13);
 for(const p of pages.filter(x=>x!=='404.html'&&!retired.has(x))){
  const url='https://tradebridgeintelligence.com/'+(p==='index.html'?'':p.slice(0,-'index.html'.length));
  assert.ok(locs.includes(url),p);assert.ok(b.read('static/'+p).includes('rel="canonical" href="'+url+'"'),p);
 }
 assert.ok(!sitemap.includes('/intake-received/'));assert.ok(!sitemap.includes('/newsletter-confirmation/'));
}));
test('robots permits public indexing; Vercel root and artifact have no global X-Robots-Tag',()=>withBuild(b=>{
 const robots=b.read('static/robots.txt'),cfg=b.read('config.json'),vercel=fs.readFileSync(path.join(root,'vercel.json'),'utf8');
 assert.match(robots,/Allow: \//);assert.match(robots,/Sitemap: https:\/\/tradebridgeintelligence\.com\/sitemap\.xml/);
 assert.doesNotMatch(robots,/Disallow:\s*\//);
 assert.doesNotMatch(cfg,/X-Robots-Tag|noindex|nofollow|noarchive/i);
 assert.doesNotMatch(vercel,/X-Robots-Tag|noindex|nofollow|noarchive/i);
 assert.equal(JSON.parse(vercel).git.deploymentEnabled,false);
}));
test('Vercel routes cover the home page, all directory URLs, 404 and deny deferred APIs',()=>withBuild(b=>{
 const routes=JSON.parse(b.read('config.json')).routes;
 assert.ok(routes.some(r=>r.src==='^/$'&&r.dest==='/index.html'));
 assert.ok(routes.some(r=>r.handle==='filesystem'));
 assert.ok(routes.some(r=>r.status===404&&r.dest==='/404.html'));
 assert.ok(routes.some(r=>r.status===404&&r.src.includes('api')));
 assert.ok(routes.some(r=>r.continue&&r.headers['X-Content-Type-Options']==='nosniff'));
 for(const p of pages.filter(x=>x.endsWith('/index.html')))assert.ok(routes.some(r=>r.dest==='/'+p),p);
 for(const p of ['tradebridge-logo-nav.png','tradebridge-logo-full.png',
 'assets/original-globe.png','assets/site.css','assets/site.js','assets/site-config.js'])
  assert.ok(fs.statSync(path.join(b.out,'static',p)).size>0,p);
}));
test('public output contains no forms, submissions, Turnstile, API, marketing tracking or private material',()=>withBuild(b=>{
 for(const p of pages){const h=b.read('static/'+p);
  for(const re of [/<form(?:\s|>)/i,/<(?:input|textarea|select)(?:\s|>)/i,
  /<button[^>]+type=["']submit/i,/challenges\.cloudflare\.com|cf-turnstile/i,
  /<script[^>]+src=["']https?:\/\//i])assert.doesNotMatch(h,re,p);
 }
 const js=b.read('static/assets/site.js');
 assert.match(js,/menu-toggle/);
 assert.doesNotMatch(js,/sessionStorage|localStorage|fetch\s*\(|CustomEvent|dataLayer|turnstile/i);
 const config=b.read('static/assets/site-config.js');
 assert.match(config,/mode:"email-only-public"/);
 assert.doesNotMatch(config,/intakeApiBaseUrl|turnstile|ga4MeasurementId/i);
 const files=allFiles(b.out);
 for(const bad of ['api/','reviews/','scripts/','tests/','.github/','CNAME','vercel.json','intake-service/'])
  assert.ok(!files.some(f=>f===bad||f.startsWith('static/'+bad)),bad);
}));
test('Start Here remains email-only with all division subjects, privacy access and warnings',()=>withBuild(b=>{
 const h=b.read('static/start/index.html');
 assert.ok(h.includes('mailto:jnichols@tradebridgeintelligence.com'));
 for(const slug of ['commercial-intelligence','business-operations','ventures'])
  assert.ok(h.includes('id="'+slug+'"'));
 for(const name of ['Commercial Intelligence','Business Operations','Ventures'])
  assert.ok(h.includes('subject='+encodeURIComponent('TradeBridge Inquiry — '+name)),name);
 assert.match(h,/href="\/privacy\/"/);
 assert.match(h,/Do not email passwords, banking details, regulated information/);
 assert.match(h,/a reply is not guaranteed/);
 assert.match(b.read('static/privacy/index.html'),/Google Workspace/);
 assert.match(b.read('static/accessibility/index.html'),/email contact option/);
}));
test('the historic review-only builder remains locked to non-production, noindex output',()=>{
 const c=fs.readFileSync(path.join(root,'scripts/build-website-first.cjs'),'utf8');
 assert.ok(c.includes('Option A production build NOT authorized'));
 assert.ok(c.includes('noindex,nofollow,noarchive'));
 assert.ok(c.includes('Disallow: /'));
 assert.ok(c.includes('REVIEW_ONLY_NO_PUBLICATION'));
});
test('public builder refuses accidental review-mode output',()=>{
 const b=build({TRADEBRIDGE_BUILD_TARGET:'review'});
 try{assert.notEqual(b.proc.status,0);assert.match(b.proc.stderr,/requires TRADEBRIDGE_BUILD_TARGET=production/)}
 finally{b.close()}
});
test('public builder refuses configured deferred intake, challenge, analytics, webhook and datastore',()=>{
 for(const name of ['TRADEBRIDGE_INTAKE_API_BASE_URL','TRADEBRIDGE_TURNSTILE_SITEKEY',
  'TRADEBRIDGE_GA4_MEASUREMENT_ID','OPPORTUNITY_DESK_WEBHOOK_URL','UPSTASH_REDIS_REST_URL']){
  const b=build({[name]:'synthetic_value'});
  try{assert.notEqual(b.proc.status,0,name);assert.match(b.proc.stderr,/Deferred feature configuration forbidden/)}
  finally{b.close()}
 }
});
test('public release output is deterministic for the same exact source',()=>{
 const a=build(),b=build();
 try{assert.equal(a.proc.status,0,a.proc.stderr);assert.equal(b.proc.status,0,b.proc.stderr);
  assert.deepEqual(JSON.parse(a.proc.stdout),JSON.parse(b.proc.stdout));
  assert.deepEqual(allFiles(a.out),allFiles(b.out));
  for(const f of allFiles(a.out))assert.deepEqual(fs.readFileSync(path.join(a.out,f)),fs.readFileSync(path.join(b.out,f)),f);
 }finally{a.close();b.close()}
});
