/**
 * Reports missing fields & very short body content.
 * Run: node scripts/audit-content.js
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const CONTENT_ROOT = path.join(ROOT,'src','content');

function walk(dir){
  const out = [];
  if(!fs.existsSync(dir)) return out;
  for(const e of fs.readdirSync(dir)){
    const full = path.join(dir,e);
    const st = fs.statSync(full);
    if(st.isDirectory()) out.push(...walk(full));
    else if(e.endsWith('.md')) out.push(full);
  }
  return out;
}

function parseFrontmatter(txt){
  if(!txt.startsWith('---')) return { data:{}, body:txt };
  const end = txt.indexOf('\n---',3);
  if(end === -1) return { data:{}, body:txt };
  const head = txt.slice(3,end).trim();
  const body = txt.slice(end+4);
  const data = {};
  head.split(/\r?\n/).forEach(line=>{
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if(m){
      let v = m[2].trim();
      if(v.startsWith('"')||v.startsWith("'")) {
        try { v = JSON.parse(v.replace(/'/g,'"')); } catch {}
      }
      data[m[1]] = v;
    }
  });
  return { data, body };
}

function main(){
  const files = walk(CONTENT_ROOT);
  const issues = [];
  files.forEach(f=>{
    const rel = f.replace(ROOT+path.sep,'');
    const txt = fs.readFileSync(f,'utf8');
    const { data, body } = parseFrontmatter(txt);
    const collection = rel.split(path.sep)[2]; // src/content/<collection>/
    if(collection === 'games'){
      if(!data.players) issues.push({file:rel, issue:'Missing players'});
      if(!data.equipment) issues.push({file:rel, issue:'Missing equipment'});
    }
    if(collection === 'cocktails' || collection==='shots'){
      if(!data.ingredients) issues.push({file:rel, issue:'Missing ingredients'});
      if(!data.method) issues.push({file:rel, issue:'Missing method'});
    }
    if(body.replace(/\s+/g,' ').length < 120){
      issues.push({file:rel, issue:'Body very short (<120 chars)'});
    }
  });

  if(!issues.length){
    console.log('All good – no issues found.');
  } else {
    console.log('Content Issues:');
    issues.forEach(i=> console.log(`${i.file}: ${i.issue}`));
  }
}

main();
