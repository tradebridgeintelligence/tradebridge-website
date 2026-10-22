'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../infra/D06_RENDER_HEADERS_CANDIDATE.json'),'utf8'));
const rule=new Map(manifest.rules.map(x=>[x.name.toLowerCase(),x.value]));
test('W05: proposed Render static headers are review-only and location-scoped',()=>{
 assert.equal(manifest.origin,'staging');
 assert.equal(manifest.path,'/*');
 assert.match(manifest.note,/SOURCE-ONLY PROPOSAL/);
 assert.equal(rule.get('referrer-policy'),'strict-origin-when-cross-origin');
 assert.match(rule.get('permissions-policy'),/geolocation=\(\)/);
 assert.equal(rule.get('x-frame-options'),'DENY');
 assert.equal(rule.get('x-content-type-options'),'nosniff');
});
test('W05: report-only CSP excludes unsafe evaluation, external analytics and wildcard hosts',()=>{
 const csp=rule.get('content-security-policy-report-only');
 assert.ok(csp,'Report-only policy required; never activate untested enforcing CSP');
 assert.match(csp,/script-src 'self'/);
 assert.match(csp,/connect-src 'self' https:\/\/tradebridge-website-intake-staging\.onrender\.com/);
 assert.match(csp,/frame-ancestors 'none'/);
 assert.doesNotMatch(csp,/unsafe-eval|googletagmanager|google-analytics|https:\s|http:\s|\s\*\s/);
 assert.equal(rule.has('content-security-policy'),false);
 assert.equal(rule.has('access-control-allow-origin'),false);
});
test('W05: static frontend does not embed cross-origin executable script or GA4',()=>{
 for(const p of ['index.html','start/index.html','insights/index.html','privacy/index.html']){
  const html=fs.readFileSync(path.join(__dirname,'..',p),'utf8');
  assert.doesNotMatch(html,/<script[^>]+src=["']https?:\/\//i,p);
  assert.doesNotMatch(html,/googletagmanager|gtag\(/i,p);
 }
});
