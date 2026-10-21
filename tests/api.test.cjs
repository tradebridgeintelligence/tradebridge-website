'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const intake=require('../api/intake');
const newsletter=require('../api/newsletter');
for(const key of ['OPPORTUNITY_DESK_WEBHOOK_URL','OPPORTUNITY_DESK_WEBHOOK_TOKEN','UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN','INTAKE_RATE_LIMIT_SALT'])delete process.env[key];
function invoke(handler,body,method='POST',headers={}){
  const req={method,body,headers:{host:'tradebridge-approved-preview.vercel.app',...headers}};
  const response={code:200,headers:{},payload:null,setHeader(k,v){this.headers[k]=v;return this;},
    status(c){this.code=c;return this;},json(p){this.payload=p;return this;}};
  return Promise.resolve(handler(req,response)).then(()=>response);
}
const valid={name:'Sample Applicant',company:'SampleCo',email:'work@example.com',goal:'Investigate an industrial market',why_now:'Planning for next quarter',intent:'research',timing:'now',follow_up_ack:true,newsletter_consent:false};
test('intake allows POST only',async()=>{const r=await invoke(intake,valid,'GET');assert.equal(r.code,405)});
test('intake rejects invalid email',async()=>{const r=await invoke(intake,{...valid,email:'not-an-email'});assert.equal(r.code,422)});
test('intake requires explicit follow-up permission',async()=>{const r=await invoke(intake,{...valid,follow_up_ack:false});assert.equal(r.code,422)});
test('intake rejects forged origins',async()=>{const r=await invoke(intake,valid,'POST',{origin:'https://untrusted.example'});assert.equal(r.code,403)});
test('intake rejects honeypot',async()=>{const r=await invoke(intake,{...valid,website_fax:'spam'});assert.equal(r.code,400)});
test('intake fails closed without secure receiver',async()=>{const r=await invoke(intake,valid);assert.equal(r.code,503);assert.equal(r.payload.accepted,false)});
test('Phase One newsletter rejects all enrollment requests without forwarding',async()=>{\n const r=await invoke(newsletter,{email:'work@example.com',consent:true,client_submission_id:'synthetic-only-001'});\n assert.equal(r.code,410);assert.equal(r.payload.accepted,false);assert.equal(r.payload.error,'newsletter_unavailable');\n});\ntest('Phase One newsletter rejects malformed requests without acknowledgment',async()=>{\n const r=await invoke(newsletter,{email:'',consent:false});assert.equal(r.code,410);assert.equal(r.payload.accepted,false);\n});\ntest('Phase One newsletter permits no GET subscription',async()=>{\n const r=await invoke(newsletter,{},'GET');assert.equal(r.code,405);\n});\n