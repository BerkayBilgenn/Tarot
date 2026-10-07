const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {createLocalStore}=require('../../server/oracle-local-store.js'),{issueOwner}=require('../../server/oracle-identity.js');
const testEnv={ORACLE_ENABLED:'true',QWEN_API_KEY:'test-secret',QWEN_WORKSPACE_ID:'ws-test',QWEN_MODEL:'qwen3.8-flash',ORACLE_SIGNING_SECRET:'x'.repeat(32)};
const payload={mode:'generate',reading:{id:'test-reading',spreadId:'daily',cards:[{positionKey:'today',cardId:'major-03',reversed:false}]}};
function req(body=payload,options={}){return {method:'POST',headers:{host:'miloruna.test',origin:'https://miloruna.test','content-type':'application/json',cookie:issueOwner(testEnv.ORACLE_SIGNING_SECRET,0).cookie.split(';')[0],'x-forwarded-for':'192.0.2.1'},body,...options};}
function response(){return {statusCode:200,headers:{},text:'',setHeader(k,v){this.headers[k.toLowerCase()]=v;},writeHead(status,headers){this.statusCode=status;for(const[k,v]of Object.entries(headers||{}))this.setHeader(k,v);},end(s=''){this.text+=s;}};}
async function call(handler,request){const res=response();await handler(request,res);return res;}
async function store(t){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'miloruna-handler-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));return createLocalStore({file:path.join(dir,'data.json')});}
module.exports={testEnv,payload,req,response,call,store};
