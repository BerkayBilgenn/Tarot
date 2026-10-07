'use strict';
const PRICES={'qwen3.8-flash':{input:150,output:470},'qwen3.7-flash-2026-07-15':{input:30,output:130}};
function loadConfig(env){
 const model=env.QWEN_MODEL||'qwen3.8-flash',prices=PRICES[model];
 if(!prices||!env.ORACLE_SIGNING_SECRET||env.ORACLE_SIGNING_SECRET.length<32)return null;
 const workspace=env.QWEN_WORKSPACE_ID||'';
 if(workspace&&!/^[a-zA-Z0-9-]{1,80}$/.test(workspace))return null;
 const budget=Number(env.ORACLE_BUDGET_USD||10),daily=Number(env.ORACLE_DAILY_LIMIT||2);
 if(!Number.isFinite(budget)||budget<0||budget>1000||!Number.isInteger(daily)||daily<0||daily>1000)return null;
 return {model,prices,enabled:env.ORACLE_ENABLED==='true',key:env.QWEN_API_KEY,secret:env.ORACLE_SIGNING_SECRET,
 endpoint:workspace?`https://${workspace}.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/chat/completions`:null,
 limitNano:Math.floor(budget*1e9),dailyLimit:daily};
}
function reserveCost(messages,maxTokens,config){
 const inputBound=Buffer.byteLength(JSON.stringify(messages),'utf8')+512;
 if(inputBound>32000)throw new Error('input-too-large');
 return {nano:inputBound*config.prices.input+maxTokens*config.prices.output,inputBound,maxTokens};
}
function usageCost(usage,config,reservation){
 if(!usage||!Number.isInteger(usage.prompt_tokens)||!Number.isInteger(usage.completion_tokens)||usage.prompt_tokens<0||usage.completion_tokens<0||usage.prompt_tokens>reservation.inputBound||usage.completion_tokens>reservation.maxTokens)return reservation.nano;
 return usage.prompt_tokens*config.prices.input+usage.completion_tokens*config.prices.output;
}
module.exports={loadConfig,reserveCost,usageCost};
