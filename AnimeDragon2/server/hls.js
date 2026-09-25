import {database} from './database.js';
import {createCache} from './cache.js';
const keys=createCache(4),enc=new TextEncoder();
const fail=(status,message)=>Object.assign(new Error(message),{status});
// Only this verified HLS provider and its segment CDNs are supported.
// This is not a general URL proxy. No cookies or viewer credentials are forwarded.
export function allowedMedia(value){
  try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&
    (u.hostname==='embedplayer2.xyz'&&/^\/(?:cdn\/hls|hls)\//.test(u.pathname)||/^plosia\d+\.xyz$/.test(u.hostname)&&u.pathname.startsWith('/p/')||u.hostname==='imgcdn44.dpopdrop89.store'&&u.pathname.startsWith('/cdn/'));}catch{return false;}
}
export function canRelaySource(source){return allowedMedia(source.url);}
async function key(env){const secret=env.AUTH_SECRET||(await database(env)).AUTH_SECRET;return keys.get(secret,3600000,()=>crypto.subtle.importKey('raw',enc.encode('animedragon-hls-v1:'+secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']));}
const hex=bytes=>[...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
async function ticket(env){const expires=String(Math.floor(Date.now()/1000)+7200);return expires+'.'+hex(await crypto.subtle.sign('HMAC',await key(env),enc.encode(expires)));}
function local(url,token){return '/api/video?ticket='+token+'&url='+encodeURIComponent(url);}
export async function compatibleSources(result,env){
  if(!result.streams?.some(s=>allowedMedia(s.url)))return result;
  const token=await ticket(env);
  const streams=result.streams.map(s=>allowedMedia(s.url)?{...s,url:local(s.url,token),type:'application/vnd.apple.mpegurl',name:s.name+' · HLS'}:s);
  return {...result,...streams[0],streams};
}
export function rewritePlaylist(text,base,token){
  if(!text.trimStart().startsWith('#EXTM3U'))throw fail(502,'A fonte não retornou uma lista HLS válida.');
  const rewrite=value=>{const url=new URL(value,base).href;if(!allowedMedia(url))throw fail(502,'O provedor mudou o endereço dos vídeos. Atualize as fontes.');return local(url,token);};
  return text.split(/\r?\n/).map(line=>!line.trim()?line:line.startsWith('#')?line.replace(/URI="([^"]+)"/g,(_,uri)=>`URI="${rewrite(uri)}"`):rewrite(line.trim())).join('\n');
}
async function limitedText(response){
  const reader=response.body.getReader(),chunks=[];let size=0;
  while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>1000000){await reader.cancel();throw fail(502,'Lista de vídeo grande demais.');}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}return new TextDecoder().decode(bytes);
}
export async function videoRelay(request,env){
  if(!['GET','HEAD'].includes(request.method))throw fail(405,'Método não permitido.');
  const url=new URL(request.url),token=url.searchParams.get('ticket')||'',target=url.searchParams.get('url');
  if(request.headers.get('Origin')&&request.headers.get('Origin')!==url.origin)throw fail(403,'Origem inválida.');
  if(!/^\d{10}\.[a-f0-9]{64}$/.test(token)||!allowedMedia(target))throw fail(403,'Link de vídeo inválido.');
  const [expires,signature]=token.split('.');if(Number(expires)<Date.now()/1000||Number(expires)>Date.now()/1000+7210)throw fail(403,'Atualize as fontes: o link expirou.');
  const bytes=Uint8Array.from(signature.match(/../g),x=>parseInt(x,16));
  if(!await crypto.subtle.verify('HMAC',await key(env),bytes,enc.encode(expires)))throw fail(403,'Link de vídeo inválido.');
  const headers=new Headers();const range=request.headers.get('Range');if(range&&/^bytes=\d*-\d*$/.test(range))headers.set('Range',range);
  let upstream=target,response;
  for(let i=0;i<3;i++){
    // Fixed player headers documented by this provider; never supplied by a visitor.
    if(new URL(upstream).hostname==='imgcdn44.dpopdrop89.store'){headers.set('Referer','https://play2.echovideo.ru/');headers.set('Origin','https://play2.echovideo.ru');}else{headers.delete('Referer');headers.delete('Origin');}
    response=await fetch(upstream,{method:request.method,headers,redirect:'manual',signal:AbortSignal.timeout(10000)});
    if(response.status<300||response.status>=400)break;
    const redirect=response.headers.get('Location');await response.body?.cancel();
    if(!redirect||!allowedMedia(new URL(redirect,upstream).href))throw fail(502,'Redirecionamento de vídeo não compatível.');upstream=new URL(redirect,upstream).href;
  }
  if(!response.ok){await response.body?.cancel();throw fail(502,'O servidor de vídeo está indisponível. Tente outra fonte.');}
  let type=response.headers.get('Content-Type')||'application/octet-stream';
  // This CDN labels even its HLS playlists as JPEG. Inspect a bounded first chunk.
  if(new URL(upstream).hostname==='imgcdn44.dpopdrop89.store'&&/image\/jpeg/i.test(type)&&request.method==='GET'){
    const reader=response.body.getReader();let first=await reader.read();
    if(first.done)throw fail(502,'A fonte retornou um vídeo vazio.');
    while(first.value.length<7){const next=await reader.read();if(next.done)break;const bytes=new Uint8Array(first.value.length+next.value.length);bytes.set(first.value);bytes.set(next.value,first.value.length);first={value:bytes,done:false};}
    const prefix=new TextDecoder().decode(first.value.subarray(0,16));
    if(prefix.startsWith('#EXTM3U'))type='application/vnd.apple.mpegurl';
    else if(first.value[0]===0x47)type='video/mp2t';
    else{await reader.cancel();throw fail(502,'Formato de vídeo não reconhecido.');}
    const body=new ReadableStream({start(c){c.enqueue(first.value);},async pull(c){const x=await reader.read();if(x.done)c.close();else c.enqueue(x.value);},cancel(reason){return reader.cancel(reason);}});
    response=new Response(body,{status:response.status,headers:response.headers});
  }
  if(!/(?:video|audio)\/|mpegurl|octet-stream/i.test(type)){await response.body?.cancel();throw fail(502,'O provedor retornou uma página em vez do vídeo.');}
  const outgoing=new Headers({'Content-Type':type,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin','Content-Security-Policy':"default-src 'none'; sandbox"});
  if(/mpegurl/i.test(type)&&request.method==='GET'){
    outgoing.set('Content-Type','application/vnd.apple.mpegurl');return new Response(rewritePlaylist(await limitedText(response),upstream,token),{headers:outgoing});
  }
  for(const name of ['Content-Range','Accept-Ranges'])if(response.headers.has(name))outgoing.set(name,response.headers.get(name));
  return new Response(response.body,{status:response.status,headers:outgoing});
}
