'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('W02 intake retains uncertain receipt/replay and explicit false marketing permission',()=>{
 const js=read('assets/site.js');
 assert.doesNotMatch(js,/Nothing has been recorded|Your information has not been received/);
 assert.match(js,/It may have been recorded/);
 assert.match(js,/tb_intake_submission_id_v2/);
 assert.match(js,/payload.newsletter_consent=false/);
 assert.match(js,/client_submission_id=submissionId/);
 assert.match(js,/\/v1\/intake/);
 assert.doesNotMatch(js,/\/v1\/newsletter|newsletter-form|newsletter_optin_requested/);
 const start=read('start/index.html');
 assert.match(start,/name="follow_up_ack" required/);
 assert.match(start,/name="utm_source"/);
 assert.match(start,/name="growth_campaign_id"/);
 assert.match(start,/href="\/privacy\/"/);
 assert.doesNotMatch(start,/name="newsletter_consent"/);
});

test('W02 removes inactive subscription and optional analytics controls',()=>{
 const pages=['index.html','404.html','about/index.html','accessibility/index.html',
 'business-operations/index.html','commercial-intelligence/index.html',
 'how-tradebridge-works/index.html','insights/index.html',
 'insights/disconnected-workflows/index.html',
 'insights/selective-ownership/index.html',
 'insights/the-tradebridge-standard/index.html',
 'intake-received/index.html','newsletter-confirmation/index.html',
 'privacy/index.html','start/index.html','ventures/index.html'];
 for(const p of pages){const html=read(p);
  assert.doesNotMatch(html,/measurement-settings|measurement-panel|data-measurement=/,p);
  assert.doesNotMatch(html,/id="newsletter-form"|id="newsletter"/,p);
 }
 assert.doesNotMatch(read('insights/index.html'),/Subscribe|id="news-email"/);
 assert.doesNotMatch(read('assets/site.js'),/googletagmanager|gtag\(|measurement-settings|newsletter-form/);
 assert.match(read('newsletter-confirmation/index.html'),/newsletter enrollment is unavailable/i);
 assert.match(read('newsletter-confirmation/index.html'),/noindex/);
});

test('W02 retired newsletter API cannot forward or acknowledge opt-in',()=>{
 const js=read('api/newsletter.js');
 assert.match(js,/newsletter_unavailable/);
 assert.doesNotMatch(js,/deliver\(|configured\(|rateLimit\(/);
});

test('W04 static release excludes API, private data and deployment configuration',()=>{
 const dst=path.join(root,'dist-static');
 const env={...process.env,TRADEBRIDGE_BUILD_TARGET:'staging',TRADEBRIDGE_STATIC_OUT_DIR:dst,TRADEBRIDGE_INTAKE_API_BASE_URL:'',TRADEBRIDGE_GA4_MEASUREMENT_ID:''};
 cp.execFileSync(process.execPath,[path.join(root,'scripts/build-render-static.cjs')],{env});
 for(const p of ['index.html','start/index.html','ventures/index.html','assets/site.js','assets/site-config.js'])assert.equal(fs.existsSync(path.join(dst,p)),true,p);
 for(const p of ['api/_common.js','intake-service','vercel.json','.github','tests','CNAME'])assert.equal(fs.existsSync(path.join(dst,p)),false,p);
 const cfg=fs.readFileSync(path.join(dst,'assets/site-config.js'),'utf8');assert.match(cfg,/"intakeApiBaseUrl":""/);
 const html=fs.readFileSync(path.join(dst,'index.html'),'utf8');assert.match(html,/name="robots" content="noindex,nofollow,noarchive"/);
});

test('W04 production build refuses missing API destination',()=>{
 const env={...process.env,TRADEBRIDGE_BUILD_TARGET:'production',TRADEBRIDGE_INTAKE_API_BASE_URL:''};
 const r=cp.spawnSync(process.execPath,[path.join(root,'scripts/build-render-static.cjs')],{env,encoding:'utf8'});
 assert.notEqual(r.status,0);assert.match(r.stderr,/Production build requires verified intake API origin/);
});

test('W04 build refuses optional GA4 activation',()=>{
 const env={...process.env,TRADEBRIDGE_BUILD_TARGET:'staging',TRADEBRIDGE_GA4_MEASUREMENT_ID:'G-ABC123XYZ'};
 const r=cp.spawnSync(process.execPath,[path.join(root,'scripts/build-render-static.cjs')],{env,encoding:'utf8'});
 assert.notEqual(r.status,0);assert.match(r.stderr,/Phase One excludes GA4 measurement/);
});
