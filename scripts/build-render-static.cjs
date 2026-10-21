'use strict';
/* Non-production preparation: builds public-only assets for a Render Static Site.
 * Production build fails closed without approved HTTPS API origin.
 * Do not include /api, /intake-service, repository metadata or workspace files.
 */
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const dest=path.resolve(process.env.TRADEBRIDGE_STATIC_OUT_DIR||path.join(root,'dist-static'));
const api=String(process.env.TRADEBRIDGE_INTAKE_API_BASE_URL||'').trim();
if(process.env.TRADEBRIDGE_GA4_MEASUREMENT_ID)throw Error('Phase One excludes GA4 measurement');
const measurement='';
if(api){const u=new URL(api);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.pathname!=='/')throw Error('API base must be a bare HTTPS origin');}
if(process.env.TRADEBRIDGE_BUILD_TARGET==='production'&&!api)throw Error('Production build requires verified intake API origin');

if(dest===root||root.startsWith(dest+path.sep))throw Error('Refusing to overwrite source tree');
fs.rmSync(dest,{recursive:true,force:true});fs.mkdirSync(dest,{recursive:true});
const files=['index.html','404.html','robots.txt','sitemap.xml','tradebridge-logo-nav.png','tradebridge-logo-full.png'];
const dirs=['about','accessibility','assets','business-operations','commercial-intelligence','how-tradebridge-works','insights','intake-received','newsletter-confirmation','privacy','start','ventures'];
for(const file of files)fs.copyFileSync(path.join(root,file),path.join(dest,file));
for(const dir of dirs)fs.cpSync(path.join(root,dir),path.join(dest,dir),{recursive:true});
const cfg={intakeApiBaseUrl:api,ga4MeasurementId:measurement};
fs.writeFileSync(path.join(dest,'assets','site-config.js'),'window.TRADEBRIDGE_CONFIG='+JSON.stringify(cfg)+';\n');
if(process.env.TRADEBRIDGE_BUILD_TARGET!=='production'){
  const visit=(dir)=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,e.name);
    if(e.isDirectory())visit(p);
    else if(e.name.endsWith('.html')){
      let html=fs.readFileSync(p,'utf8');
      if(!/<meta[^>]+name=["']robots["']/i.test(html))html=html.replace(/<head>/i,'<head><meta name="robots" content="noindex,nofollow,noarchive">');
      fs.writeFileSync(p,html);
    }
  }};visit(dest);
}
console.log('Public-only static build ready:',dest,'apiConfigured='+Boolean(api),'ga4Configured='+Boolean(measurement));
