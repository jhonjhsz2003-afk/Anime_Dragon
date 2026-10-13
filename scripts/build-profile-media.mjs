import {readdir,readFile,mkdir,writeFile,stat} from 'node:fs/promises';
import {join,relative,resolve,sep} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve('web/assets/profile-media');
const sets=[['GIFs','gif'],['Stickers','sticker']];
const extensions=new Set(['.gif','.webp','.png','.apng','.jpg','.jpeg','.avif']);
const rows=[];const ids=new Set();let bytesTotal=0;let skipped=0;
for(const [folder,kind] of sets){
 const folderRoot=join(root,folder);await mkdir(folderRoot,{recursive:true});
 const visit=async dir=>{
  for(const entry of await readdir(dir,{withFileTypes:true})){
   const name=entry.name,path=join(dir,name);
   if(entry.isSymbolicLink()){++skipped;continue;}
   if(entry.isDirectory()){await visit(path);continue;}
   if(!entry.isFile())continue;
   const ext=name.match(/\.[a-zA-Z0-9]+$/)?.[0]?.toLowerCase();
   if(!ext||!extensions.has(ext)){if(!name.startsWith('.'))++skipped;continue;}
   const info=await stat(path);if(info.size===0){++skipped;continue;}
   if(info.size>24*1024*1024){throw new Error(`Arquivo maior que 24 MiB (Cloudflare Assets): ${path}`);}
   const rel=relative(folderRoot,path).split(sep);
   // Keep original file names intact. The manifest encodes each URL segment.
   const url=`/assets/profile-media/${folder}/${rel.map(encodeURIComponent).join('/')}`;
   const normalized=url.toLowerCase();if(ids.has(normalized)){throw new Error(`Nome de mídia duplicado: ${url}`);}ids.add(normalized);
   const digest=createHash('sha256').update(await readFile(path)).digest('hex').slice(0,20);
   const label=rel.join(' ').replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim().slice(0,120)||'Mídia';
   rows.push({url,kind,title:label,size:info.size,hash:digest});bytesTotal+=info.size;
  }
 };
 await visit(folderRoot);
}
// Same-content duplicates within the same kind are removed from the search (not deleted from disk).
const seen=new Set();const unique=rows.filter(row=>{const key=`${row.kind}:${row.hash}`;if(seen.has(key))return false;seen.add(key);return true;});
unique.sort((a,b)=>a.kind.localeCompare(b.kind)||a.title.localeCompare(b.title,'pt-BR'));
const json={version:1,generatedAt:new Date().toISOString(),items:unique.map(({hash,...rest})=>rest)};
await writeFile(join(root,'catalog.json'),JSON.stringify(json));
const gifPaths=unique.filter(x=>x.kind==='gif').map(x=>x.url);
const stickerPaths=unique.filter(x=>x.kind==='sticker').map(x=>x.url);
await mkdir(resolve('server'),{recursive:true});
await writeFile(resolve('server/local-media-index.js'),`// Gerado por npm run media:index; não edite manualmente.\nexport const localGifPaths = new Set(${JSON.stringify(gifPaths)});\nexport const localStickerPaths = new Set(${JSON.stringify(stickerPaths)});\n`);
console.log(`Catálogo local pronto: ${gifPaths.length} GIFs, ${stickerPaths.length} stickers, ${rows.length-unique.length} cópias idênticas ocultas, ${skipped} arquivos ignorados.`);
console.log(`Tamanho total: ${(bytesTotal/1024/1024).toFixed(1)} MiB. Atenção ao espaço do GitHub e limites do Cloudflare.`);
