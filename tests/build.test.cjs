const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
test('production output includes all page resources while excluding private and development files',()=>{
  const modulePath=path.join(__dirname,'../scripts/build.cjs');
  assert(fs.existsSync(modulePath),'Production build missing');
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'miloruna-build-'));
  try{
    const src=path.join(root,'source'),out=path.join(root,'dist');fs.mkdirSync(src);
    const {build,FILES,ASSET_DIRS}=require(modulePath);
    for(const file of FILES)fs.writeFileSync(path.join(src,file),file==='index.html'?'<script src="app.js?v=1"></script>':file);
    for(const dir of ASSET_DIRS){fs.mkdirSync(path.join(src,'assets',dir),{recursive:true});fs.writeFileSync(path.join(src,'assets',dir,'fixture.svg'),'<svg/>');}
    const night=path.join(src,'assets','night');
    for(const file of ['.env','private.json','.DS_Store'])fs.writeFileSync(path.join(night,file),'private-fixture');
    fs.writeFileSync(path.join(root,'outside.svg'),'outside-fixture');
    fs.symlinkSync(path.join(root,'outside.svg'),path.join(night,'outside.svg'));
    for(const file of ['.env','oracle-proxy.js','CURSOR-README.md'])fs.writeFileSync(path.join(src,file),'private-fixture');
    fs.mkdirSync(path.join(src,'tests'));fs.writeFileSync(path.join(src,'tests','private.test.cjs'),'private-fixture');
    build({sourceRoot:src,outDir:out});
    for(const file of FILES)assert(fs.existsSync(path.join(out,file)),file+' missing');
    for(const file of ['.env','oracle-proxy.js','CURSOR-README.md','tests'])assert(!fs.existsSync(path.join(out,file)),file+' exposed');
    for(const file of ['.env','private.json','.DS_Store','outside.svg'])assert(!fs.existsSync(path.join(out,'assets','night',file)),file+' exposed through assets');
    fs.writeFileSync(path.join(out,'obsolete.js'),'old');build({sourceRoot:src,outDir:out});assert(!fs.existsSync(path.join(out,'obsolete.js')),'stale output retained');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
