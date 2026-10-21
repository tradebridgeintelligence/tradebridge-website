'use strict';
// D06 Phase One: newsletter enrollment is excluded by executive decision D01.
// Deliberately fail closed even if legacy relay credentials are configured.
// No network request, database write, or subscription acknowledgement is allowed.
const {respond}=require('./_common');
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST'){
    res.setHeader('Allow','POST');
    return respond(res,405,'method_not_allowed');
  }
  return respond(res,410,'newsletter_unavailable');
};
