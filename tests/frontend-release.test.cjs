'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
test('client errors do not falsely claim no record was saved',()=>{
 const js=fs.readFileSync(path.join(root,'assets/site.js'),'utf8');
 assert.doesNotMatch(js,/Nothing has been recorded|Your information has not been received/);
 assert.match(js,/It may have been recorded/);
 assert.match(js,/tb_intake_submission_id_v2/);
 assert.match(js,/tb_newsletter_submission_id_v2/);
 assert.match(js,/client_submission_id:newsletterId/);
 assert.match(js,/\/v1\/intake/);
 assert.match(js,/\/v1\/newsletter/);
});
test('newsletter relay preserves client-supplied idempotency identity',()=>{
 const js=fs.readFileSync(path.join(root,'api/newsletter.js'),'utf8');
 assert.match(js,/client_submission_id=clean\(raw.client_submission_id/);
 assert.doesNotMatch(js,/client_submission_id:String\(Date.now/);
});
test('static release excludes API, private data and deployment configuration',()=>{
 const dst=path.join(root,'dist-static');
 const env={...process.env,TRADEBRIDGE_BUILD_TARGET:'staging',TRADEBRIDGE_STATIC_OUT_DIR:dst,TRADEBRIDGE_INTAKE_API_BASE_URL:'',TRADEBRIDGE_GA4_MEASUREMENT_ID:''};
 cp.execFileSync(process.execPath,[path.join(root,'scripts/build-render-static.cjs')],{env});
 for(const p of ['index.html','start/index.html','ventures/index.html','assets/site.js','assets/site-config.js'])assert.equal(fs.existsSync(path.join(dst,p)),true,p);
 for(const p of ['api/_common.js','intake-service','vercel.json','.github','tests','CNAME'])assert.equal(fs.existsSync(path.join(dst,p)),false,p);
 const cfg=fs.readFileSync(path.join(dst,'assets/site-config.js'),'utf8');assert.match(cfg,/intakeApiBaseUrl:""/);
});
test('production build refuses missing API destination',()=>{
 const env={...process.env,TRADEBRIDGE_BUILD_TARGET:'production',TRADEBRIDGE_INTAKE_API_BASE_URL:''};
 const r=cp.spawnSync(process.execPath,[path.join(root,'scripts/build-render-static.cjs')],{env,encoding:'utf8'});
 assert.notEqual(r.status,0);assert.match(r.stderr,/Production build requires verified intake API origin/);
});
