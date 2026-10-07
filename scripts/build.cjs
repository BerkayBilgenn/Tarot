'use strict';
const fs = require('node:fs'), path = require('node:path');
const {writeDiscovery} = require('./discovery.cjs');
const FILES = ['index.html','favicon.png','favicon.ico','night.tokens.css','night.css','night.motion.css','guide.css','home-discovery.css','discovery.js','cards.js','spreads.js','ui-helpers.js','motion.js','shuffle.js','card-notes.js','yorum-motoru.js','reading.js','oracle.js','reminder.js','app.js'];
const ASSET_DIRS = ['brand','cards','fonts','night'];
const ASSET_TYPES = new Set(['.svg','.webp','.png','.jpg','.jpeg','.woff','.woff2']);
function publicAsset(file) {
  const stat = fs.lstatSync(file), name = path.basename(file);
  if (stat.isSymbolicLink() || name.startsWith('.')) return false;
  return stat.isDirectory() || (stat.isFile() && (ASSET_TYPES.has(path.extname(name).toLowerCase()) || name.endsWith('-OFL.txt')));
}
function build({sourceRoot = path.resolve(__dirname,'..'), outDir = path.join(sourceRoot,'dist')} = {}) {
  if (path.resolve(sourceRoot) === path.resolve(outDir)) throw new Error('Build output must be separate from source');
  for (const file of FILES) if (!fs.existsSync(path.join(sourceRoot,file))) throw new Error('Missing application file: '+file);
  fs.rmSync(outDir,{recursive:true,force:true});
  fs.mkdirSync(outDir,{recursive:true});
  for (const file of FILES) fs.copyFileSync(path.join(sourceRoot,file),path.join(outDir,file));
  for (const dir of ASSET_DIRS) fs.cpSync(path.join(sourceRoot,'assets',dir),path.join(outDir,'assets',dir),{recursive:true,filter:publicAsset});
  writeDiscovery(outDir);
  return outDir;
}
if (require.main === module) console.log('Production output: '+build());
module.exports = {build, FILES, ASSET_DIRS};
