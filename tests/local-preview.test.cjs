const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
test('local launch prevents two processes from writing the same budget ledger',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'miloruna-local-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const {acquireLock}=require('../scripts/local-preview.cjs');
 const release=await acquireLock(path.join(dir,'lock'));await assert.rejects(acquireLock(path.join(dir,'lock')));await release();const again=await acquireLock(path.join(dir,'lock'));await again();
});
