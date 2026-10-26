'use strict';
// Option A preflight only. Deliberately never produces or uploads public assets.
// Release requires independent operating, privacy/legal, hosted-QA and Command GO.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const required={
  sourceRevision:'6640f14ce8bfb63caa42c3d7245ae9f60d23b3a2',
  architecture:'website-first-email-only',
  gates:[
    {id:'GROWTH_DESIGN',state:'ACCEPT_OFFLINE',note:'Growth R01 ACCEPT; R02 offline only; Design ACCEPT'},
    {id:'EMAIL_EXTERNAL_DELIVERY',state:'OPEN',note:'Gmail self-delivery is not external inbound verification'},
    {id:'OD_OA01_OA07',state:'OPEN',note:'Manual triage, cadence, absences and case handling not independently accepted'},
    {id:'PRIVACY_LEGAL',state:'OPEN',note:'Qualified email-only notice and lawful preservation review outstanding'},
    {id:'HOSTED_BROWSER_SECURITY',state:'OPEN',note:'Hosted routes, cross-device accessibility, headers/TLS and rollback unverified'},
    {id:'PUBLIC_BUILD_SEO',state:'NOT_AUTHORIZED',note:'Current review builder intentionally emits noindex/robots disallow'},
    {id:'COMMAND_PRODUCTION_GO',state:'NOT_AUTHORIZED',note:'No PR merge, DNS, Render release or publication approved'}
  ]
};
const expected=[
 ['start/index.html','mailto:jnichols@tradebridgeintelligence.com'],
 ['privacy/index.html','Google Workspace'],
 ['insights/selective-ownership/index.html','Contacting TradeBridge, including by email'],
 ['assets/site.js','menu-toggle'],
 ['scripts/build-website-first.cjs','REVIEW_ONLY_NO_PUBLICATION']
];
for(const [p,text] of expected){
 const abs=path.join(root,p);
 if(!fs.existsSync(abs)||!fs.readFileSync(abs,'utf8').includes(text))throw Error('Option A release source invariant failed: '+p);
}
const reviewBuilder=fs.readFileSync(path.join(root,'scripts/build-website-first.cjs'),'utf8');
if(!reviewBuilder.includes('Option A production build NOT authorized')||
 !reviewBuilder.includes('noindex,nofollow,noarchive')||
 !reviewBuilder.includes('Disallow: /'))throw Error('Review-only lock missing');
const config=Object.freeze({...required});
const blockers=config.gates.filter(g=>g.state!=='ACCEPT_OFFLINE').map(g=>g.id);
const sha256=crypto.createHash('sha256').update(reviewBuilder).digest('hex');
const report={...config,reviewBuilderSha256:sha256,blockers,publicReleasePermitted:false};
if(require.main===module){
 process.stdout.write(JSON.stringify(report,null,2)+'\n');
 // Read-only preflight exit 0 signifies that reporting succeeded, NOT a release GO.
}
module.exports={report};
