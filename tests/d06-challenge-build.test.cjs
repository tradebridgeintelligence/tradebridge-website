'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
const builder=path.join(root,'scripts/build-render-static.cjs');
function build(extra={}){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tb-d06-challenge-'));
  const env={...process.env,TRADEBRIDGE_STATIC_OUT_DIR:dir,
    TRADEBRIDGE_GA4_MEASUREMENT_ID:'',TRADEBRIDGE_TURNSTILE_SITEKEY:'',...extra};
  const result=cp.spawnSync(process.execPath,[builder],{env,encoding:'utf8'});
  return {dir,result,cleanup:()=>fs.rmSync(dir,{recursive:true,force:true})};
}
test('staging source preserves existing behavior when challenge provider is not configured',()=>{
  const b=build({TRADEBRIDGE_BUILD_TARGET:'staging'});
  try{
    assert.equal(b.result.status,0,b.result.stderr);
    const cfg=fs.readFileSync(path.join(b.dir,'assets/site-config.js'),'utf8');
    assert.match(cfg,/"turnstileSitekey":""/);
    const html=fs.readFileSync(path.join(b.dir,'start/index.html'),'utf8');
    assert.match(html,/noindex,nofollow,noarchive/);
  }finally{b.cleanup()}
});
test('production build fails closed without public challenge sitekey',()=>{
  const b=build({TRADEBRIDGE_BUILD_TARGET:'production',
    TRADEBRIDGE_INTAKE_API_BASE_URL:'https://intake.example.invalid'});
  try{
    assert.notEqual(b.result.status,0);
    assert.match(b.result.stderr,/Production build requires approved challenge sitekey/);
  }finally{b.cleanup()}
});
test('production candidate bundles only public sitekey and exact API origin, not secrets',()=>{
  const b=build({TRADEBRIDGE_BUILD_TARGET:'production',
    TRADEBRIDGE_INTAKE_API_BASE_URL:'https://intake.example.invalid',
    TRADEBRIDGE_TURNSTILE_SITEKEY:'synthetic-public-widget-key-1234'});
  try{
    assert.equal(b.result.status,0,b.result.stderr);
    const cfg=fs.readFileSync(path.join(b.dir,'assets/site-config.js'),'utf8');
    assert.match(cfg,/"turnstileSitekey":"synthetic-public-widget-key-1234"/);
    assert.match(cfg,/"intakeApiBaseUrl":"https:\/\/intake.example.invalid"/);
    assert.doesNotMatch(cfg,/TURNSTILE_SECRET|RATE_LIMIT_SALT|DATABASE_URL/);
    const html=fs.readFileSync(path.join(b.dir,'start/index.html'),'utf8');
    assert.doesNotMatch(html,/name="robots" content="noindex/);
  }finally{b.cleanup()}
});
test('inquiry retries keep existing submission key but reset one-use challenge token',()=>{
  const js=fs.readFileSync(path.join(root,'assets/site.js'),'utf8');
  assert.match(js,/tradebridge_intake/);
  assert.match(js,/payload.turnstile_token=token/);
  assert.match(js,/delete payload\['cf-turnstile-response'\]/);
  assert.match(js,/challenge.reset\(\)/);
  assert.match(js,/client_submission_id=submissionId/);
  assert.match(js,/It may have been recorded/);
  assert.match(js,/payload.newsletter_consent=false/);
  assert.doesNotMatch(js,/TURNSTILE_SECRET|googletagmanager|gtag\(/);
});
test('invalid public sitekey is rejected by production builder',()=>{
  const b=build({TRADEBRIDGE_BUILD_TARGET:'production',
    TRADEBRIDGE_INTAKE_API_BASE_URL:'https://intake.example.invalid',
    TRADEBRIDGE_TURNSTILE_SITEKEY:'invalid key with spaces'});
  try{
    assert.notEqual(b.result.status,0);
    assert.match(b.result.stderr,/Invalid public Turnstile sitekey/);
  }finally{b.cleanup()}
});
