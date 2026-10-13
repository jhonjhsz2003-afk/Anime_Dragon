import {DRAGONGIF_ORIGIN,isDragonMediaUrl} from './local-media.js?v=31.3.0';
const $=id=>document.getElementById(id);
function report(id,good,summary,detail){const node=$(id);node.classList.toggle('success',good);node.classList.toggle('failure',!good);node.querySelector('.state').textContent=summary;node.querySelector('small').textContent=detail;}
async function json(url){const response=await fetch(url,{mode:'cors',credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(12000)});const data=await response.json();if(!response.ok||!data.ok)throw new Error(data.error||`HTTP ${response.status}`);return data;}
let running=false;
async function run(){
 if(running)return;running=true;$('retry').disabled=true;$('preview').replaceChildren();
 for(const id of ['ad','dg','search','img']){const node=$(id);node.classList.remove('success','failure');node.querySelector('.state').textContent='Testando...';}
 try{const d=await json('/api/health');report('ad',d.version==='31.3.0',`Versão ${d.version}`,d.version==='31.3.0'?'Esta versão contém a integração direta.':'Aguarde o deploy v31.3 e atualize a página com Ctrl+F5.');}catch(e){report('ad',false,'Falha ao consultar AnimeDragon',e.message);}
 try{const d=await json(DRAGONGIF_ORIGIN+'/api/v1/health');report('dg',true,'API acessível · '+d.version,'Consulta feita diretamente do seu navegador, com CORS permitido.');}catch(e){report('dg',false,'API bloqueada ou fora do ar',`${e.message}. Se o link direto abrir, verifique CORS e Content-Security-Policy.`);}
 try{
  const stats=await json(DRAGONGIF_ORIGIN+'/api/v1/stats');
  const d=await json(DRAGONGIF_ORIGIN+'/api/v1/media?type=all&limit=1&page=1');
  const total=Number(stats.total)||0;
  if(total===0||!Array.isArray(d.items)||d.items.length===0){report('search',false,'Biblioteca vazia', 'O DragonGIF respondeu, mas não encontrou mídias no catálogo publicado.');report('img',false,'Sem imagem para testar','Adicione mídias ao DragonGIF e gere o catálogo.');}
  else{
   report('search',true,`${Number(stats.gifs)||0} GIFs · ${Number(stats.stickers)||0} stickers`,'API retornou resultado pesquisável.');
   const media=d.items[0];
   if(!isDragonMediaUrl(media.url,media.kind))throw new Error('O catálogo devolveu um endereço inesperado.');
   const image=new Image();image.className='preview';image.alt=media.title||'Prévia DragonGIF';
   const loading=new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('O arquivo não carregou como imagem.'))});
   image.src=media.url;$('preview').appendChild(image);await loading;
   report('img',true,'Imagem carregada',media.title||'Mídia estática acessível.');
  }
 }catch(e){report('search',false,'Falha na busca',e.message);report('img',false,'Não foi possível testar',e.message);}
 finally{running=false;$('retry').disabled=false;}
}
$('retry').addEventListener('click',run);
void run();
