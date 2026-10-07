'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {build}=require('./build.cjs'),{createServer}=require('./preview.cjs');
const {createHandler}=require('../server/oracle-handler.js'),{createLocalStore}=require('../server/oracle-local-store.js');
async function acquireLock(file){
 await fs.mkdir(path.dirname(file),{recursive:true,mode:0o700});
 try{const h=await fs.open(file,'wx',0o600);await h.writeFile(String(process.pid));await h.close();}
 catch(e){if(e.code!=='EEXIST')throw e;const pid=Number(await fs.readFile(file,'utf8'));let alive=true;try{process.kill(pid,0);}catch(error){if(error.code==='ESRCH')alive=false;}
  if(alive)throw new Error('Another local preview owns this ledger');await fs.unlink(file);return acquireLock(file);
 }
 return ()=>fs.unlink(file).catch(()=>{});
}
async function main(){
 const root=path.resolve(__dirname,'..'),envFile=path.join(root,'.env.local');
 process.loadEnvFile(envFile);
 if(!process.env.ORACLE_SIGNING_SECRET){const secret=crypto.randomBytes(32).toString('hex');await fs.appendFile(envFile,'\nORACLE_SIGNING_SECRET='+secret+'\n',{mode:0o600});process.env.ORACLE_SIGNING_SECRET=secret;}
 const release=await acquireLock(path.join(root,'.local-data/preview.lock'));
 const providerFetch=async(url,options)=>{
  const response=await fetch(url,options);const metadata=await response.clone().json().catch(()=>({}));
  if(response.ok)console.log('[Qwen usage]',JSON.stringify({model:metadata.model,prompt:metadata.usage?.prompt_tokens,completion:metadata.usage?.completion_tokens,finish:metadata.choices?.[0]?.finish_reason}));
  else console.log('[Qwen error]',response.status,metadata.error?.code||metadata.code||'unavailable');
  return response;
 };
 build({sourceRoot:root});
 const handler=createHandler({env:process.env,store:createLocalStore({file:path.join(root,'.local-data/oracle.json')}),providerFetch});
 const server=createServer({handler});
 server.once('error',async()=>{await release();process.exitCode=1;console.error('Local preview could not start');});
 server.listen(Number(process.env.PORT||8771),'127.0.0.1',()=>console.log('Miloruna local preview: http://127.0.0.1:'+server.address().port));
 const stop=()=>server.close(async()=>{await release();process.exit(0);});process.once('SIGINT',stop);process.once('SIGTERM',stop);
}
if(require.main===module)main().catch(()=>{console.error('Local configuration could not start');process.exitCode=1;});
module.exports={acquireLock};
