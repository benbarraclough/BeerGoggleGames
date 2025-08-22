// (Shortened minimal version)
import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

const ROOT = process.cwd();
const LEGACY_DIR = path.join(ROOT, 'legacy');
const CONTENT_DIR = path.join(ROOT, 'src', 'content');

const FORCE = process.env.FORCE === 'true';
const DRY = process.env.DRY === 'true';

const td = new TurndownService();

function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p,{recursive:true}); }
function walk(dir){
  if(!fs.existsSync(dir)) return [];
  const out=[];
  for(const f of fs.readdirSync(dir)){
    const full=path.join(dir,f);
    const st=fs.statSync(full);
    if(st.isDirectory()) out.push(...walk(full));
    else if(/\.html?$/i.test(f)) out.push(full);
  }
  return out;
}
function slugify(s){
  return (s||'').toLowerCase()
    .replace(/&/g,'and')
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/-{2,}/g,'-')
    .replace(/^-|-$/g,'')
    .slice(0,120) || 'item';
}
function extract(html, filePath){
  const $=cheerio.load(html);
  const title=$('meta[property="og:title"]').attr('content')
    || $('h1').first().text()
    || $('title').text()
    || path.basename(filePath,'.html');
  const cover=$('meta[property="og:image"]').attr('content') || $('img').first().attr('src') || '';
  const excerpt=$('p').map((_,p)=>$(p).text().trim()).get().find(t=>t.length>30 && t.length<300) || '';
  const ingredientsHeading = $('h2,h3').filter((_,e)=>/ingredients?/i.test($(e).text())).first();
  let ingredients=[];
  if(ingredientsHeading.length){
    const list=ingredientsHeading.next('ul,ol');
    if(list.length) ingredients=list.find('li').map((_,li)=>$(li).text().trim()).get();
  }
  const methodHeading = $('h2,h3').filter((_,e)=>/(method|instructions|steps)/i.test($(e).text())).first();
  let method=[];
  if(methodHeading.length){
    const list=methodHeading.next('ul,ol');
    if(list.length) method=list.find('li').map((_,li)=>$(li).text().trim()).get();
  }
  const bodyHtml = $('main').html() || $('article').html() || $('body').html() || '';
  const markdown = td.turndown(bodyHtml);
  return { title, cover, excerpt, ingredients, method, markdown };
}
function classify(filePath, data){
  const p=filePath.toLowerCase();
  if(p.includes('/games/')) return 'games';
  if(p.includes('/cocktail')) return 'cocktails';
  if(p.includes('/shot')) return 'shots';
  if(p.includes('/blog/') || p.includes('/post')) return 'posts';
  if(data.ingredients.length){
    return (data.ingredients.length<=4 || /shot/i.test(data.title)) ? 'shots':'cocktails';
  }
  return 'games';
}
function buildFrontmatter(collection, data, slug){
  const fm = { title: data.title || slug };
  if(data.cover) fm.cover = data.cover;
  if(data.excerpt) fm.excerpt = data.excerpt;
  if(collection==='cocktails' || collection==='shots'){
    if(data.ingredients.length) fm.ingredients=data.ingredients;
    if(data.method.length) fm.method=data.method;
  }
  return fm;
}
function writeFile(collection, slug, fm, body){
  const dir=path.join(CONTENT_DIR, collection);
  ensureDir(dir);
  const file=path.join(dir, `${slug}.md`);
  if(fs.existsSync(file) && !FORCE){
    console.log(`Skip exists: ${collection}/${slug}.md`);
    return;
  }
  const front = Object.entries(fm).map(([k,v])=>{
    if(Array.isArray(v)) return `${k}:\n${v.map(i=>'  - '+i).join('\n')}`;
    return `${k}: ${JSON.stringify(v)}`;
  }).join('\n');
  const out=`---\n${front}\n---\n\n${body.trim()}\n`;
  if(DRY){
    console.log(`[DRY] Would write ${collection}/${slug}.md`);
  } else {
    fs.writeFileSync(file,out,'utf8');
    console.log(`Wrote: ${collection}/${slug}.md`);
  }
}
function main(){
  if(!fs.existsSync(LEGACY_DIR)){
    console.log('No legacy directory.');
    return;
  }
  const files = walk(LEGACY_DIR);
  if(!files.length){
    console.log('No legacy HTML files.');
    return;
  }
  console.log(`Found ${files.length} legacy HTML files.`);
  files.forEach(f=>{
    try{
      const html=fs.readFileSync(f,'utf8');
      const data=extract(html,f);
      const slug=slugify(data.title);
      const collection=classify(f,data);
      const fm=buildFrontmatter(collection,data,slug);
      writeFile(collection, slug, fm, data.markdown || '');
    }catch(e){
      console.warn(`Failed ${f}: ${e.message}`);
    }
  });
  console.log('Done.');
}
main();
