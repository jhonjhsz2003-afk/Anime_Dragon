// Load only the chosen subtitle. No subtitle request delays the video.
export function toVtt(input){
 const text=String(input).replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').trim();
 if(text.length>2000000)throw new Error('A legenda é grande demais. Escolha outra versão.');
 if(/^WEBVTT(?:\s|$)/.test(text))return text;
 if(!/\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}/.test(text)||/^\s*<(?:!doctype|html)/i.test(text))throw new Error('Formato de legenda incompatível. Escolha uma versão SRT ou VTT.');
 return 'WEBVTT\n\n'+text.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g,'$1.$2');
}
export function mergeCaptions(...lists){
 const unique=new Map();
 for(const t of lists.flat()){
   try{const u=new URL(t.src);if(u.protocol!=='https:')continue;u.hash='';if(!unique.has(u.href))unique.set(u.href,{...t,src:u.href});}catch{}
 }
 return [...unique.values()].slice(0,40);
}
export async function readCaption(src,signal){
 const response=await fetch(src,{credentials:'omit',signal:AbortSignal.any([signal,AbortSignal.timeout(10000)]),referrerPolicy:'no-referrer'});
 if(!response.ok)throw new Error('A legenda não respondeu. Escolha outra versão.');
 if(Number(response.headers.get('Content-Length'))>2000000){await response.body?.cancel();throw new Error('Legenda grande demais.');}
 const reader=response.body.getReader(),decoder=new TextDecoder();let size=0,text='';
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2000000)throw new Error('Legenda grande demais.');text+=decoder.decode(value,{stream:true});}text+=decoder.decode();return toVtt(text);}
 finally{await reader.cancel().catch(()=>{});}
}
