'use strict';
const {chromium}=require('playwright');
const AxeBuilder=require('@axe-core/playwright').default;
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=process.env.SITE_URL||'http://127.0.0.1:8765';
const captures=path.join(process.cwd(),'artifacts','screenshots');
fs.mkdirSync(captures,{recursive:true});
(async()=>{
 let failed=[],tested=0;
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [1440,1280,1024,768,390,320]){
   const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/',{waitUntil:'networkidle'});
   const hero=page.locator('#homepage-title');
   assert.equal(await hero.count(),1);
   assert.equal(await hero.isVisible(),true);
   const logo=page.locator('.site-header .brand');
   const box=await logo.boundingBox();
   assert.ok(box&&box.width>=180,'Header logo white box must be visible');
   const check=await page.evaluate(()=>({
     scroll:document.documentElement.scrollWidth,
     viewport:innerWidth,
     banner:getComputedStyle(document.body,'::before').display,
     brandBg:getComputedStyle(document.querySelector('.site-header .brand')).backgroundImage,
     nav:getComputedStyle(document.querySelector('#primary-menu')).display,
     globe:document.querySelector('.original-globe')?.complete&&document.querySelector('.original-globe')?.naturalWidth>0,
   }));
   if(check.scroll>check.viewport+1)failed.push('Horizontal scroll at '+width+': '+check.scroll);
   if(check.banner!=='none')failed.push('White banner remains at '+width);
   if(!check.brandBg.includes('tradebridge-logo-full.png'))failed.push('Full logo not used at '+width);
   if(!check.globe)failed.push('Original globe image fails at '+width);
   if(errors.length)failed.push('JS error at '+width+': '+errors.join(';'));
   const toggle=page.locator('#menu-toggle');
   if(width<=1240){
     assert.equal(await toggle.isVisible(),true,'Menu toggle must appear on smaller screens');
     await toggle.click();
     assert.equal(await toggle.getAttribute('aria-expanded'),'true');
     assert.equal(await page.locator('#primary-menu').isVisible(),true);
     await toggle.click();
     assert.equal(await toggle.getAttribute('aria-expanded'),'false');
   } else {
     assert.equal(check.nav,'flex');
   }
   await page.screenshot({path:path.join(captures,'home-'+width+'.png'),fullPage:true});
   tested++;
   await page.close();
  }
  for(const route of ['commercial-intelligence/','business-operations/','ventures/','how-tradebridge-works/','insights/','about/','start/']){
   const context=await browser.newContext({viewport:{width:1366,height:900}});
   const page=await context.newPage();
   const response=await page.goto(base+'/'+route,{waitUntil:'networkidle'});
   if(response.status()!==200)failed.push('Page HTTP '+response.status()+' at /'+route);
   if((await page.locator('main h1').count())!==1)failed.push('H1 count on /'+route);
   if(route==='start/'){
     const form=page.locator('#intake-form');
     await form.locator('#name').fill('Test Example');
     await form.locator('#email').fill('person@example.com');
     await form.locator('#company').fill('Example Co');
     await form.locator('#goal').fill('Requesting a workflow review');
     await form.locator('#why-now').fill('Timing matters');
     await form.locator('#intent').selectOption('operations');
     await form.locator('#timing').selectOption('now');
     await form.locator('#follow-up').check();
     const valid=await form.evaluate(el=>el.checkValidity());
     if(!valid)failed.push('Valid intake form fails client validation');
   }
   if(['start/','ventures/','commercial-intelligence/','business-operations/'].includes(route)){
     const report=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
     const severe=report.violations.filter(v=>['serious','critical'].includes(v.impact));
     if(severe.length)failed.push('Serious a11y violations on '+route+': '+severe.map(v=>v.id+' '+v.nodes.length).join(', '));
   }
   await page.close();
   await context.close();
   tested++;
  }
 }finally{await browser.close()}
 console.log('Browser QA tested '+tested+' viewports/routes.');
 if(failed.length){for(const f of failed)console.error('FAIL:',f);process.exitCode=1}
 else console.log('PASS: responsive, navigation, assets, intake validation and critical a11y gates');
})().catch(e=>{console.error(e);process.exitCode=1});
