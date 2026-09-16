import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

// Maintenance only: updates local cache keys, never generates or publishes articles.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets=['assets/css/style.css','assets/js/site.js'];
const versions=Object.fromEntries(assets.map(asset=>[asset,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,asset))).digest('hex').slice(0,12)]));
function htmlFiles(dir) {
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    const file=path.join(dir,entry.name);
    if(entry.isSymbolicLink()) throw new Error(`Refusing symlink: ${file}`);
    if(entry.isDirectory()) return htmlFiles(file);
    return entry.name.endsWith('.html')?[file]:[];
  });
}
const files=[...fs.readdirSync(root).filter(name=>name.endsWith('.html')).map(name=>path.join(root,name)),
  ...['about','areas','articles','blog','contact','privacy','services'].flatMap(dir=>htmlFiles(path.join(root,dir))),path.join(root,'scripts/generate-areas.mjs')];
for(const file of files) {
  if(fs.lstatSync(file).isSymbolicLink()) throw new Error(`Refusing symlink: ${file}`);
  let source=fs.readFileSync(file,'utf8');
  for(const [asset,version] of Object.entries(versions)) source=source.replaceAll(new RegExp(`${asset.replaceAll('.','\\.')}\\?v=[a-f0-9]+`,'g'),`${asset}?v=${version}`);
  fs.writeFileSync(file,source);
}
console.log(`Refreshed CSS/JS cache keys in ${files.length} local files.`,versions);
