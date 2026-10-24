'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
const script=path.join(root,'scripts/build-website-first.cjs');
function build(envExtra={}){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tb-option-a-'));
  const env={...process.env,
    TRADEBRIDGE_WEBSITE_FIRST_OUT_DIR:dir,
    TRADEBRIDGE_BUILD_TARGET:'review',
    TRADEBRIDGE_INTAKE_API_BASE_URL:'',
    TRADEBRIDGE_TURNSTILE_SITEKEY:'',
    TRADEBRIDGE_GA4_MEASUREMENT_ID:'',
    ...envExtra};
  const result=cp.spawnSync(process.execPath,[script],{env,encoding:'utf8'});
  return {dir,result,cleanup:()=>fs.rmSync(dir,{recursive:true,force:true})};
}
const read=(dir,name)=>fs.readFileSync(path.join(dir,name),'utf8');
function allFiles(dir){
  const entries=[];
  function walk(p){
    for(const d of fs.readdirSync(p,{withFileTypes:true})){
      const full=path.join(p,d.name);
      if(d.isDirectory())walk(full);
      else entries.push(path.relative(dir,full).split(path.sep).join('/'));
    }
  }
  walk(dir);return entries.sort();
}

test('Option A offline build contains direct email contact and no active collection surface',()=>{
  const b=build();
  try{
    assert.equal(b.result.status,0,b.result.stderr);
    const p=read(b.dir,'start/index.html');
    const privacy=read(b.dir,'privacy/index.html');
    const receipt=read(b.dir,'intake-received/index.html');
    assert.match(p,/<h1>Start a TradeBridge conversation by email\.<\/h1>/);
    assert.match(p,/href="mailto:jnichols@tradebridgeintelligence\.com\?subject=TradeBridge%20Inquiry"/);
    assert.match(p,/href="\/how-tradebridge-works\/">See the Process<\/a>/);
    assert.doesNotMatch(p,/href="\/start\/\?intent=not-sure[^"]*"[^>]*>See the Process/);
    assert.match(p,/not an online inquiry form/);
    assert.match(p,/does not submit, store or acknowledge an inquiry/);
    assert.match(privacy,/Google Workspace/);
    assert.match(privacy,/no Cloudflare inquiry challenge/);
    assert.match(privacy,/does not promise immediate deletion from every system or backup/);
    assert.match(receipt,/<h1>Website inquiry form unavailable<\/h1>/);
    assert.match(receipt,/Opening this page does not confirm/);
    assert.doesNotMatch(receipt,/<h1>Inquiry received<\/h1>/);
  }finally{b.cleanup()}
});

test('Option A output excludes active forms, backend endpoints, marketing and private files',()=>{
  const b=build();
  try{
    assert.equal(b.result.status,0,b.result.stderr);
    const files=allFiles(b.dir);
    const html=files.filter(f=>f.endsWith('.html'));
    assert.equal(html.length,16,'The 16-route static site must remain intact');
    for(const name of html){
      const c=read(b.dir,name);
      assert.doesNotMatch(c,/<form(?:\s|>)/i,name);
      assert.doesNotMatch(c,/<(?:input|textarea|select)(?:\s|>)/i,name);
      assert.doesNotMatch(c,/<button[^>]+type="submit"/i,name);
      assert.doesNotMatch(c,/\/v1\/intake|\/api\/intake|challenges\.cloudflare\.com/i,name);
      assert.doesNotMatch(c,/<script[^>]+src="https?:\/\//i,name);
      assert.match(c,/<meta name="robots" content="[^"]*noindex/i,name);
      assert.match(c,/<main id="main">/i,name);
      assert.match(c,/tradebridge-logo-nav\.png/,name);
    }
    for(const privatePath of [
      'api','tests','.github','intake-service','scripts','CNAME','vercel.json','sitemap.xml'
    ]) assert.equal(files.some(f=>f===privatePath||f.startsWith(privatePath+'/')),false,
      privatePath+' must not be in output');
    assert.equal(files.includes('start/index.html'),true);
    assert.equal(files.includes('privacy/index.html'),true);
    assert.equal(files.includes('index.html'),true);
    assert.equal(files.includes('assets/site.css'),true);
    assert.match(read(b.dir,'robots.txt'),/^User-agent: \*\nDisallow: \/\n$/);
  }finally{b.cleanup()}
});

test('Option A browser script only handles navigation; no storage, tracking or network',()=>{
  const b=build();
  try{
    assert.equal(b.result.status,0,b.result.stderr);
    const c=read(b.dir,'assets/site.js');
    assert.match(c,/menu-toggle/);
    assert.match(c,/aria-expanded/);
    for(const x of [
      /sessionStorage|localStorage|indexedDB/i,
      /\bfetch\s*\(|XMLHttpRequest|WebSocket/i,
      /Turnstile|tradebridge_intake|\/v1\/intake|\/api\/intake/i,
      /newsletter_consent|follow_up_ack|client_submission_id/i,
      /CustomEvent|analytics|tradebridgeTrack/i,
      /dataLayer|googletagmanager|gtag\s*\(/i
    ]) assert.doesNotMatch(c,x);
    const cfg=read(b.dir,'assets/site-config.js');
    assert.match(cfg,/mode:"email-only-review"/);
    assert.doesNotMatch(cfg,/intakeApiBaseUrl|turnstile|ga4MeasurementId|secret|database|api\/intake/i);
    assert.match(read(b.dir,'WEBSITE_FIRST_REVIEW_MANIFEST.json'),/REVIEW_ONLY_NO_PUBLICATION/);
  }finally{b.cleanup()}
});

test('Option A removes inactive subscription success claims from all relevant metadata',()=>{
  const b=build();
  try{
    assert.equal(b.result.status,0,b.result.stderr);
    const c=read(b.dir,'newsletter-confirmation/index.html');
    assert.match(c,/<title>Newsletter unavailable \| TradeBridge Intelligence<\/title>/);
    assert.match(c,/og:title" content="Newsletter enrollment unavailable"/);
    assert.match(c,/Newsletter enrollment is unavailable/);
    assert.match(c,/Visiting this page does not confirm a subscription/);
    assert.doesNotMatch(c,/Subscription Request Acknowledged|Confirmation for acknowledged/);
    assert.match(c,/noindex/);
  }finally{b.cleanup()}
});

test('Option A preserves three divisions and quarantines two unresolved Ventures public claims for independent ruling',()=>{
  const b=build();
  try{
    assert.equal(b.result.status,0,b.result.stderr);
    const index=read(b.dir,'index.html');
    const ventures=read(b.dir,'ventures/index.html');
    for(const div of ['FIND IT.','BUILD IT.','OWN IT.'])assert.ok(index.includes(div));
    assert.match(index,/original-globe\.png/);
    assert.match(index,/intelligence-led business building and investment company/);
    assert.match(ventures,/converts proprietary intelligence, operating expertise, and technology into long-term ownership and enterprise value/);
    // These claims are NOT approved by this check. The check only protects the
    // independent Growth/Design dispute from being silently edited or waived.
  }finally{b.cleanup()}
});

test('Option A builder refuses production and any hidden intake, anti-bot or analytics configuration',()=>{
  for(const [label,override,message] of [
    ['production',{TRADEBRIDGE_BUILD_TARGET:'production'},/production build NOT authorized/],
    ['intake',{TRADEBRIDGE_INTAKE_API_BASE_URL:'https://intake.example.invalid'},/must not include intake/],
    ['challenge',{TRADEBRIDGE_TURNSTILE_SITEKEY:'synthetic_public_key_12345'},/must not include intake/],
    ['analytics',{TRADEBRIDGE_GA4_MEASUREMENT_ID:'G-FAKE123'},/must not include intake/]
  ]){
    const b=build(override);
    try{
      assert.notEqual(b.result.status,0,label+' incorrectly succeeded');
      assert.match(b.result.stderr,message,label);
    }finally{b.cleanup()}
  }
});

test('Option A output is deterministic and accompanied by matching review-only checksums',()=>{
  const a=build(),b=build();
  try{
    assert.equal(a.result.status,0,a.result.stderr);
    assert.equal(b.result.status,0,b.result.stderr);
    const m1=JSON.parse(read(a.dir,'WEBSITE_FIRST_REVIEW_MANIFEST.json'));
    const m2=JSON.parse(read(b.dir,'WEBSITE_FIRST_REVIEW_MANIFEST.json'));
    assert.deepEqual(m1,m2);
    assert.equal(m1.classification,'REVIEW_ONLY_NO_PUBLICATION');
    assert.equal(m1.renderedHtmlFiles,16);
    assert.equal(m1.noOnlineIntakeForm,true);
    assert.equal(m1.noApiOrigin,true);
    assert.equal(m1.noNewsletter,true);
    assert.equal(m1.noOptionalAnalytics,true);
    assert.equal(m1.nonIndexable,true);
    assert.equal(Object.keys(m1.sha256).length,5);
  }finally{a.cleanup();b.cleanup()}
});
