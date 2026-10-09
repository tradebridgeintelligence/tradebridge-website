'use strict';
const {parse,respond,originOK,configured,rateLimit,deliver,clean}=require('./_common');
module.exports=async function handler(req,res){
if(req.method!=='POST'){res.setHeader('Allow','POST');return respond(res,405,'method_not_allowed')}
if(!originOK(req,res))return respond(res,403,'origin_not_allowed');
const size=Number(req.headers['content-length']||0);if(size>5000)return respond(res,413,'payload_too_large');
let raw=req.body;try{if(typeof raw==='string')raw=JSON.parse(raw)}catch{return respond(res,400,'invalid_json')}
if(!raw||typeof raw!=='object'||Array.isArray(raw))return respond(res,400,'invalid_json');
const email=clean(raw.email,254),hp=clean(raw.honeypot,150);
if(hp)return respond(res,400,'invalid_request');
if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||raw.consent!==true)return respond(res,422,'newsletter_consent_required');
if(!configured())return respond(res,503,'receiver_not_configured');
try{if(!(await rateLimit(req,'newsletter')))return respond(res,429,'rate_limited');const record_id=await deliver({email,consent:true,utm_source:clean(raw.utm_source,180),utm_campaign:clean(raw.utm_campaign,180),growth_campaign_id:clean(raw.growth_campaign_id,180),growth_content_id:clean(raw.growth_content_id,180),client_submission_id:String(Date.now())+'-'+require('node:crypto').randomUUID()},'newsletter_opt_in');res.setHeader('Cache-Control','no-store');return res.status(200).json({accepted:true,record_id})}catch(e){console.error('Newsletter delivery unsuccessful:',String(e?.message||'unknown').slice(0,80));return respond(res,503,'delivery_unconfirmed')}
};
