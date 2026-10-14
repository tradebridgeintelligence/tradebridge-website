'use strict';
const {parse,respond,originOK,configured,rateLimit,deliver}=require('./_common');
module.exports=async function handler(req,res){
if(req.method!=='POST'){res.setHeader('Allow','POST');return respond(res,405,'method_not_allowed')}
if(!originOK(req,res))return respond(res,403,'origin_not_allowed');
const size=Number(req.headers['content-length']||0);if(size>12000)return respond(res,413,'payload_too_large');
const d=parse(req);if(!d)return respond(res,400,'invalid_json');
if(d.honeypot)return respond(res,400,'invalid_request');
if(!d.name||!d.company||!d.goal||!d.why_now||!d.email||!d.follow_up_ack)return respond(res,422,'required_fields_missing');
if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email))return respond(res,422,'invalid_email');
if(!['research','operations','ventures','not-sure'].includes(d.intent))return respond(res,422,'invalid_intent');
if(!['now','under-90-days','3-6-months','longer-term','unsure'].includes(d.timing))return respond(res,422,'invalid_timing');
if(d.website){try{const u=new URL(d.website);if(!['http:','https:'].includes(u.protocol))return respond(res,422,'invalid_website')}catch{return respond(res,422,'invalid_website')}}
if(!configured())return respond(res,503,'receiver_not_configured');
try{if(!(await rateLimit(req)))return respond(res,429,'rate_limited');const id=await deliver(d,'commercial_intake');res.setHeader('Cache-Control','no-store');return res.status(200).json({accepted:true,record_id:id})}catch(e){console.error('Intake delivery unsuccessful:',String(e?.message||'unknown').slice(0,80));return respond(res,503,'delivery_unconfirmed')}
};
