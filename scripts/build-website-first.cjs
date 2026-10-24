'use strict';
/*
 * Option A / TradeBridge Intelligence: EMAIL-ONLY INFORMATIONAL SITE.
 *
 * REVIEW OUTPUT ONLY. This script never generates an indexable public release.
 * Source edits, offline tests and this build are NOT deployment authorization.
 * No intake API, newsletter, Turnstile, visitor attribution or analytics.
 *
 * Uses a fixed public-file allowlist so /api, repository data and secrets do
 * not ship. Existing full-Phase-One scripts/tests remain on other branches.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const out = path.resolve(process.env.TRADEBRIDGE_WEBSITE_FIRST_OUT_DIR ||
  path.join(root, 'dist-website-first-review'));

const mode = String(process.env.TRADEBRIDGE_BUILD_TARGET || 'review');
if (!['review', 'staging'].includes(mode)) {
  throw Error('Option A production build NOT authorized; review-only output');
}
for (const key of [
  'TRADEBRIDGE_INTAKE_API_BASE_URL',
  'TRADEBRIDGE_TURNSTILE_SITEKEY',
  'TRADEBRIDGE_GA4_MEASUREMENT_ID'
]) {
  if (String(process.env[key] || '').trim()) {
    throw Error('Option A must not include intake, challenge or analytics configuration: ' + key);
  }
}
if (out === root || root.startsWith(out + path.sep) || out === path.parse(out).root) {
  throw Error('Unsafe output directory');
}
const publicFiles = [
  'index.html','404.html','robots.txt',
  'tradebridge-logo-nav.png','tradebridge-logo-full.png'
];
const publicDirs = [
  'about','accessibility','assets','business-operations',
  'commercial-intelligence','how-tradebridge-works','insights',
  'intake-received','newsletter-confirmation','privacy','start','ventures'
];
fs.rmSync(out, {recursive:true, force:true});
fs.mkdirSync(out, {recursive:true});
for (const file of publicFiles) {
  fs.copyFileSync(path.join(root, file),path.join(out, file));
}
for (const dir of publicDirs) {
  fs.cpSync(path.join(root,dir),path.join(out,dir),{recursive:true});
}

// Keep the existing harmless reference working, with no backend origin or
// tracking/marketing configuration. This file is not a license to add new JS.
fs.writeFileSync(path.join(out,'assets/site-config.js'),
  'window.TRADEBRIDGE_CONFIG=Object.freeze({mode:"email-only-review"});\n');

// Preview is deliberately nonindexable. Never flip these settings as a side
// effect of selecting a different environment; public SEO remains gated.
fs.writeFileSync(path.join(out, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
let htmlCount = 0;
const htmlFiles = [];
const visit=(dir)=>{
  for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())visit(full);
    else if(entry.name.endsWith('.html')) {
      let html=fs.readFileSync(full,'utf8');
      if (!/<meta[^>]+name=["']robots["']/i.test(html)) {
        html=html.replace(/<head>/i,
          '<head><meta name="robots" content="noindex,nofollow,noarchive">');
      }
      if (!/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html)) {
        throw Error('Non-indexable review safeguard missing: '+full);
      }
      for(const [reason,regexp] of [
        ['active form',/<form(?:\s|>)/i],
        ['form input',/<(?:input|select|textarea)(?:\s|>)/i],
        ['submit button',/<button[^>]+type=["']submit/i],
        ['web intake route',/\/(?:api\/intake|v1\/intake)(?:[\/?"'\s]|$)/i],
        ['remote browser script',/<script[^>]+src=["']https?:\/\//i],
        ['Cloudflare widget script',/challenges\.cloudflare\.com/i],
        ['marketing tag',/googletagmanager\.com|gtag\s*\(/i]
      ]) if(regexp.test(html))throw Error('Option A output contains '+reason+': '+full);
      fs.writeFileSync(full,html);
      htmlFiles.push(full);htmlCount++;
    }
  }
};
visit(out);
if(!htmlCount || !htmlFiles.some(p=>p.endsWith(path.join('start','index.html'))))
  throw Error('Email contact page missing');
const contact=fs.readFileSync(path.join(out,'start','index.html'),'utf8');
const privacy=fs.readFileSync(path.join(out,'privacy','index.html'),'utf8');
const receipt=fs.readFileSync(path.join(out,'intake-received','index.html'),'utf8');
const newsletter=fs.readFileSync(path.join(out,'newsletter-confirmation','index.html'),'utf8');
const siteJs=fs.readFileSync(path.join(out,'assets','site.js'),'utf8');
for(const [key,data,regexp] of [
  ['direct email link',contact,/mailto:jnichols@tradebridgeintelligence\.com/],
  ['email privacy disclosure',privacy,/Google Workspace/],
  ['retired receipt route',receipt,/Website inquiry form unavailable/],
  ['retired newsletter route',newsletter,/Newsletter enrollment is unavailable/],
  ['newsletter title',newsletter,/<title>Newsletter unavailable/],
  ['navigation JS',siteJs,/menu-toggle/]
]) if(!regexp.test(data))throw Error('Option A required content missing: '+key);
for(const [key,data,regexp] of [
  ['browser data storage',siteJs,/\b(?:sessionStorage|localStorage|indexedDB)\b/],
  ['network fetch',siteJs,/\bfetch\s*\(|XMLHttpRequest|WebSocket\s*\(/],
  ['submission path',siteJs,/\/v1\/intake|\/api\/intake|turnstile/i],
  ['client tracking event',siteJs,/analytics|CustomEvent|tradebridgeTrack/i],
  ['form submission control',siteJs,/client_submission_id|follow_up_ack|newsletter_consent/i],
  ['optional newsletter claim',newsletter,/Subscription Request Acknowledged|Confirmation for acknowledged/i]
]) if(regexp.test(data))throw Error('Option A forbidden browser behavior: '+key);
for (const forbidden of [
  'api', '.github', 'tests', 'scripts', 'CNAME',
  'vercel.json', 'sitemap.xml', 'intake-service'
]) if (fs.existsSync(path.join(out,forbidden)))throw Error('Private/unapproved path shipped: '+forbidden);

const hash=(s)=>crypto.createHash('sha256').update(s).digest('hex');
const manifest={
  classification:'REVIEW_ONLY_NO_PUBLICATION',
  architecture:'informational_static_site_email_contact',
  noOnlineIntakeForm:true,
  noApiOrigin:true,
  noTurnstile:true,
  noNewsletter:true,
  noOptionalAnalytics:true,
  nonIndexable:true,
  renderedHtmlFiles:htmlCount,
  sha256:{
    contact:hash(contact),
    privacy:hash(privacy),
    retiredReceipt:hash(receipt),
    retiredNewsletter:hash(newsletter),
    clientNavigation:hash(siteJs)
  }
};
fs.writeFileSync(path.join(out,'WEBSITE_FIRST_REVIEW_MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Option A SOURCE-ONLY REVIEW BUILD READY; no deployment, no production release; HTML pages='+htmlCount);
