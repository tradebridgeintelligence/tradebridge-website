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

test('Option A protects Design-selected claims and the Ventures public safeguards',()=>{
  const b=build();
  try{
    assert.equal(b.result.status,0,b.result.stderr);
    const index=read(b.dir,'index.html');
    const ventures=read(b.dir,'ventures/index.html');
    for(const div of ['FIND IT.','BUILD IT.','OWN IT.'])assert.ok(index.includes(div));
    assert.match(index,/original-globe\.png/);
    assert.ok(index.includes('TradeBridge Intelligence brings together Commercial Intelligence, Business Operations and TradeBridge Ventures. We research commercial opportunities, design operating workflows, and evaluate selective venture-building and potential ownership opportunities where evidence, economics and governance support proceeding.'));
    assert.doesNotMatch(index,/intelligence-led business building and investment company|selectively own businesses and technologies created from that intelligence/i);
    assert.match(ventures,/<h1>Evaluate opportunities for long-term ownership and enterprise value\.<\/h1>/);
    assert.ok(ventures.includes('TradeBridge Ventures evaluates opportunities to build, partner, invest or acquire where evidence, operating economics and governance support the case. Any potential ownership arrangement requires separate diligence, terms, approvals and documentation.'));
    assert.doesNotMatch(ventures,/TradeBridge Ventures converts proprietary intelligence|No website submission creates a commitment|Selectively turn operating advantage into long-term enterprise value/i);
    assert.ok(ventures.includes('Sending an email or other inquiry does not create a commitment, investment offer, equity entitlement or partnership.'));
    for(const safeguard of ['does not represent that it operates an investment fund','has committed investment capital','a closed portfolio','realized returns or exits','equity entitlement','separate diligence, terms, approvals and documentation']){
      assert.ok(ventures.includes(safeguard),'missing public claim safeguard: '+safeguard);
    }
    // These are Design-selected draft corrections, NOT independent acceptance
    // of this exact revised source or authorization to release the website.
  }finally{b.cleanup()}
});

test('Option A preserves division intent through six static email-contact journeys',()=>{
  const b=build();
  try{
    assert.equal(b.result.status,0,b.result.stderr);
    const start=read(b.dir,'start/index.html');
    const routes=[
      {path:'commercial-intelligence/index.html',anchor:'commercial-intelligence',subject:'TradeBridge Inquiry — Commercial Intelligence',label:'Contact by Email — Commercial Intelligence'},
      {path:'business-operations/index.html',anchor:'business-operations',subject:'TradeBridge Inquiry — Business Operations',label:'Contact by Email — Business Operations'},
      {path:'ventures/index.html',anchor:'ventures',subject:'TradeBridge Inquiry — Ventures',label:'Contact by Email — Ventures'}
    ];
    let total=0;
    for(const route of routes){
      const c=read(b.dir,route.path);
      const anchorLink='href="/start/#'+route.anchor+'"';
      assert.equal(c.split(anchorLink).length-1,2,'two division CTAs required: '+route.path);
      assert.equal(c.split('>'+route.label+'</a>').length-1,2,'clear email-only labels required: '+route.path);
      assert.doesNotMatch(c,/href="\/start\/\?intent=/i,route.path);
      const anchorAt=start.indexOf('<h3 id="'+route.anchor+'">');
      assert.ok(anchorAt>0,'static Start Here division anchor missing: '+route.anchor);
      const end=start.indexOf('</div>',anchorAt);
      assert.ok(end>anchorAt,'division text block not closed: '+route.anchor);
      const text=start.slice(anchorAt,end);
      const subjectHref='href="mailto:jnichols@tradebridgeintelligence.com?subject='+encodeURIComponent(route.subject)+'"';
      assert.ok(text.includes(subjectHref),'correct encoded email subject missing: '+route.anchor);
      assert.ok(text.includes('copy <strong>jnichols@tradebridgeintelligence.com</strong>'),route.anchor);
      assert.ok(text.includes('Do not include sensitive or confidential records.'),route.anchor);
      assert.ok(text.includes('href="/privacy/"'),route.anchor);
      assert.ok(text.includes('Delivery and a reply are not guaranteed.'),route.anchor);
      total+=2;
    }
    assert.equal(total,6);
    assert.doesNotMatch(read(b.dir,'assets/site.js'),/sessionStorage|localStorage|URLSearchParams|fetch\s*\(|CustomEvent/i);
  }finally{b.cleanup()}
});

test('Option A candidate copy qualifies email delivery, accessibility and privacy request scope',()=>{
  const b=build();
  try{
    assert.equal(b.result.status,0,b.result.stderr);
    const start=read(b.dir,'start/index.html');
    assert.ok(start.includes('Selecting Email TradeBridge may open your configured email application.'));
    assert.ok(start.includes('If it does not, copy jnichols@tradebridgeintelligence.com into your preferred email service.'));
    assert.ok(start.includes('Your message is sent only when you choose to send it.'));
    assert.ok(start.includes('does not submit, store or acknowledge an inquiry'));
    assert.ok(start.includes('cannot confirm delivery; a reply is not guaranteed.'));
    assert.match(start,/Do not email passwords, banking details, regulated information/);
    const access=read(b.dir,'accessibility/index.html');
    assert.ok(access.includes('If a page, navigation link or email contact option is difficult to use, we welcome feedback.'));
    assert.doesNotMatch(access,/If a page, link or form is difficult to use/);
    const privacy=read(b.dir,'privacy/index.html');
    assert.ok(privacy.includes("If you send TradeBridge an email, your email service processes the message and attempts delivery to TradeBridge's Google Workspace mail system."));
    assert.ok(privacy.includes('personal information associated with your use of this website or your correspondence with TradeBridge'));
    assert.ok(privacy.includes('We may need to verify your identity or authority'));
    assert.ok(privacy.includes('does not promise immediate deletion from every system or backup'));
    assert.doesNotMatch(privacy,/your email provider sends your message and associated address/);
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

test('Option A Growth R01 Insights disclaimer uses email-contact language without changing article protections',()=>{
  const b=build();
  try{
    assert.equal(b.result.status,0,b.result.stderr);
    const article=read(b.dir,'insights/selective-ownership/index.html');
    assert.ok(article.includes('Contacting TradeBridge, including by email, does not constitute an investment offer or create an ownership allocation or commitment. Any arrangement requires separate review, authorization, terms and documentation.'));
    assert.doesNotMatch(article,/A website inquiry does not establish an investment offer, an ownership allocation or a commitment/);
    assert.ok(article.includes('BUILD, PARTNER, INVEST and ACQUIRE describe possibilities, not standard offers.'));
    assert.ok(article.includes('Ownership should not be the default outcome of providing research, technology or operating expertise.'));
    // Historical CI remains unchanged; this is an isolated corrected review candidate.
  }finally{b.cleanup()}
});


test('Option A public-release readiness preflight remains blocked and non-mutating',()=>{
  const checker=path.join(root,'scripts/check-website-first-release-readiness.cjs');
  const p=cp.spawnSync(process.execPath,[checker],{encoding:'utf8'});
  assert.equal(p.status,0,p.stderr);
  const report=JSON.parse(p.stdout);
  assert.equal(report.publicReleasePermitted,false);
  assert.equal(report.sourceRevision,'6640f14ce8bfb63caa42c3d7245ae9f60d23b3a2');
  assert.ok(report.blockers.includes('EMAIL_EXTERNAL_DELIVERY'));
  assert.ok(report.blockers.includes('OD_OA01_OA07'));
  assert.ok(report.blockers.includes('PRIVACY_LEGAL'));
  assert.ok(report.blockers.includes('COMMAND_PRODUCTION_GO'));
  assert.equal(report.gates.find(g=>g.id==='GROWTH_DESIGN').state,'ACCEPT_OFFLINE');
});
