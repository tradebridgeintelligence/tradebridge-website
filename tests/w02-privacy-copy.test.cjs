'use strict';
// W02 public-copy candidate regression ONLY. No network, credentials or data.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const privacy=read('privacy/index.html');
const start=read('start/index.html');
const site=read('assets/site.js');

test('privacy copy replaces old receiver/draft statements without changing site navigation',()=>{
 for(const stale of [
   'Until an approved receiver is configured',
   "TradeBridge's receiving systems and policies must be reviewed before launch",
   'This is an operational draft',
   'The proposed Phase One site'
 ]) assert.equal(privacy.includes(stale),false,'stale text remains: '+stale);
 for(const expected of [
   '<title>Privacy | TradeBridge Intelligence</title>',
   'href="https://tradebridgeintelligence.com/privacy/"',
   '<main id="main">','<h1>How website information is used.</h1>',
   'href="/start/?intent=not-sure',
   'FIND IT.', 'BUILD IT.', 'OWN IT.'
 ]) assert.ok(privacy.includes(expected),'required branding/navigation missing: '+expected);
});

test('privacy copy identifies actual staging provider categories and OD-first inquiry handling',()=>{
 for(const expected of [
   'Opportunity Desk', 'Render', 'Cloudflare Turnstile','Google Workspace',
   'receiving service', 'consent records', 'security logs',
   'operational notification emails','database recovery systems'
 ]) assert.ok(privacy.includes(expected),'provider or copy gap: '+expected);
 assert.match(privacy,/Submitting an inquiry|Submission does not establish a client relationship/);
 assert.match(privacy,/investment offer or commitment/);
});

test('privacy copy does not claim unverified deletion, legal timelines or newsletter subscription',()=>{
 assert.match(privacy,/does not necessarily remove it immediately from every backup or external copy/);
 assert.match(privacy,/access, correction or deletion request/);
 assert.match(privacy,/mailto:jnichols@tradebridgeintelligence\.com/);
 assert.match(privacy,/does not offer newsletter enrollment or optional Google Analytics 4 measurement/);
 for(const phrase of ['delete all backups immediately','deleted permanently within 90 days','within 30 calendar days','guaranteed deletion','subscribe to our newsletter']) {
   assert.equal(privacy.includes(phrase),false,'unsupported public claim: '+phrase);
 }
 assert.ok(start.includes('I understand that TradeBridge Intelligence'));
 assert.ok(site.includes('payload.newsletter_consent=false'));
});

test('staging build keeps draft page noindex without causing a production launch',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tb-w02-privacy-'));
 try {
   const result=cp.spawnSync(process.execPath,[path.join(root,'scripts/build-render-static.cjs')],{
     encoding:'utf8',
     env:{...process.env,
       TRADEBRIDGE_STATIC_OUT_DIR:dir,
       TRADEBRIDGE_BUILD_TARGET:'staging',
       TRADEBRIDGE_INTAKE_API_BASE_URL:'https://intake.example.invalid',
       TRADEBRIDGE_GA4_MEASUREMENT_ID:'',
       TRADEBRIDGE_TURNSTILE_SITEKEY:'synthetic-public-key-1234567890'}
   });
   assert.equal(result.status,0,result.stderr);
   const built=fs.readFileSync(path.join(dir,'privacy/index.html'),'utf8');
   assert.match(built,/name="robots" content="noindex,nofollow,noarchive"/);
   assert.match(built,/Cloudflare Turnstile/);
   assert.match(built,/Google Workspace/);
   assert.ok(fs.existsSync(path.join(dir,'start/index.html')));
   assert.equal(fs.existsSync(path.join(dir,'api/intake.js')),false);
 }finally{
   fs.rmSync(dir,{recursive:true,force:true});
 }
});
