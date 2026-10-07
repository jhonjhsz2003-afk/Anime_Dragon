const KIND_NAMES={series:'Estreia de anime',season:'Nova temporada',episode:'Novo episódio'};
const esc=(value='')=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const calendarIcon='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 11h18M7 15h3M14 15h3"/></svg>';
const dateValid=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
export function releaseDay(now=new Date()){
 const parts=new Intl.DateTimeFormat('en',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(now));
 return ['year','month','day'].map(type=>parts.find(part=>part.type===type).value).join('-');
}
const prettyDate=value=>new Intl.DateTimeFormat('pt-BR',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z'));
const image=(path,size)=>/^\/assets\/demo\/[a-z0-9-]+\.svg$/.test(path||'')?path:/^\/[\w./-]+$/.test(path||'')?`https://image.tmdb.org/t/p/${size}${path}`:'/assets/poster-placeholder.svg';
const eventNumber=event=>{
 const season=Number.isInteger(event.season_number)?event.season_number:null,episode=Number.isInteger(event.episode_number)?event.episode_number:null;
 if(season!==null&&episode!==null)return `${season===0?'Especial':`T${season}`} · EP.${episode}`;
 if(season!==null)return season===0?'Especial':`Temporada ${season}`;
 return event.kind==='series'?'Primeira estreia':'Data anunciada';
};

export function releasesPage(){return `<section class="releases-view" aria-label="Lançamentos futuros"><header class="releases-heading"><div><span class="eyebrow">O PRÓXIMO CAPÍTULO COMEÇA AQUI</span><h1>Lançamentos</h1><p>Novos animes, novas temporadas e próximos episódios. Só o que ainda vai estrear.</p></div><div class="releases-date-badge">${calendarIcon}<span data-releases-from>Próximas datas anunciadas</span></div></header><div class="releases-controls" aria-label="Filtrar lançamentos"><div class="release-filters">${[['all','Todos'],['series','Novos animes'],['season','Temporadas'],['episode','Episódios']].map(([kind,label])=>`<button type="button" class="release-filter" data-release-kind="${kind}" aria-pressed="${kind==='all'}">${label}<span data-release-count="${kind}"></span></button>`).join('')}</div><button type="button" class="secondary release-refresh" data-releases-retry hidden>Atualizar datas</button></div><p class="releases-status" data-releases-status role="status" aria-live="polite">Consultando as próximas datas…</p><div class="releases-results" data-release-results aria-busy="true"><div class="releases-skeleton" aria-hidden="true">${Array.from({length:4},()=>'<div class="skeleton"></div>').join('')}</div></div><button type="button" class="secondary releases-more" data-releases-more hidden>Ver mais lançamentos</button><p class="releases-note">Datas previstas do catálogo, sujeitas a atualização. Os horários e a chegada do vídeo podem variar.</p></section>`;}

export function mountReleases(root,{api,onOpen=()=>{},remember=()=>{},now=()=>new Date(),economy=false}={}){
 const view=root.matches?.('.releases-view')?root:root.querySelector('.releases-view');
 if(!view||typeof api!=='function')throw new TypeError('A página e o catálogo de lançamentos precisam estar disponíveis.');
 const results=view.querySelector('[data-release-results]'),status=view.querySelector('[data-releases-status]'),more=view.querySelector('[data-releases-more]'),retry=view.querySelector('[data-releases-retry]'),filters=[...view.querySelectorAll('[data-release-kind]')];
 const state={events:new Map(),kind:'all',page:0,hasMore:false,partial:false,loading:false,error:'',limit:48,asOf:releaseDay(now())};let destroyed=false,version=0,lastRenderedDay='';
 const today=()=>{const current=releaseDay(now());return current>state.asOf?current:state.asOf;};
 const currentEvents=()=>[...state.events.values()].filter(event=>event.air_date>today()).sort((a,b)=>a.air_date.localeCompare(b.air_date)||String(a.anime.title||'').localeCompare(String(b.anime.title||''),'pt-BR')||a.key.localeCompare(b.key));
 const card=event=>{
  const title=event.anime.title||event.anime.name||'Anime',path=event.anime.backdrop_path||event.anime.poster_path,label=KIND_NAMES[event.kind],number=eventNumber(event),date=prettyDate(event.air_date),days=Math.round((Date.parse(event.air_date+'T00:00:00Z')-Date.parse(today()+'T00:00:00Z'))/86400000);
  return `<article class="release-event"><button type="button" class="release-card" data-release-key="${esc(event.key)}" aria-label="Ver ${esc(title)}, ${esc(label)}, ${esc(number)}, previsto para ${esc(date)}"><span class="release-art"><img src="${image(path,economy?'w300':'w500')}" ${!economy&&path?`srcset="${image(path,'w300')} 300w, ${image(path,'w500')} 500w, ${image(path,'w780')} 780w" sizes="(max-width:600px) calc(100vw - 40px), (max-width:1000px) 45vw, 28vw"`:''} width="500" height="281" loading="lazy" decoding="async" alt=""><span class="release-kind release-kind-${event.kind}">${label}</span><span class="release-countdown">${days===1?'Amanhã':`Em ${days} dias`}</span></span><span class="release-info"><span class="release-title">${esc(title)}</span><span class="release-episode">${esc(number)}</span>${event.episode_name&&event.episode_name!==number?`<span class="release-episode-name">${esc(event.episode_name)}</span>`:''}<span class="release-date">${calendarIcon}<time datetime="${event.air_date}">${esc(date)}</time></span><span class="release-open">Ver anime <span aria-hidden="true">→</span></span></span></button></article>`;
 };
 function render(){
  if(destroyed)return;lastRenderedDay=today();const all=currentEvents(),filtered=state.kind==='all'?all:all.filter(event=>event.kind===state.kind),visible=filtered.slice(0,state.limit),groups=new Map();
  for(const event of visible){if(!groups.has(event.air_date))groups.set(event.air_date,[]);groups.get(event.air_date).push(event);}
  results.setAttribute('aria-busy',String(state.loading));
  results.innerHTML=visible.length?[...groups].map(([date,events])=>`<section class="release-day" aria-labelledby="release-day-${date}"><div class="release-day-heading"><h2 id="release-day-${date}">${esc(prettyDate(date))}</h2><span>${new Intl.DateTimeFormat('pt-BR',{weekday:'long',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'))}</span></div><div class="release-grid">${events.map(card).join('')}</div></section>`).join(''):`<div class="releases-empty">${calendarIcon}<h2>${state.loading?'Atualizando lançamentos…':state.error?'As datas deram uma pausa.':'Nenhuma data futura anunciada por aqui.'}</h2><p>${state.error?esc(state.error):state.partial?'Algumas datas não puderam ser atualizadas. Tente consultar novamente.':state.hasMore?'Veja mais lançamentos para encontrar outras datas nesta categoria.':'Os próximos anúncios vão aparecer quando houver uma data prevista no catálogo.'}</p></div>`;
  for(const filter of filters){const kind=filter.dataset.releaseKind;filter.setAttribute('aria-pressed',String(kind===state.kind));const count=kind==='all'?all.length:all.filter(event=>event.kind===kind).length;filter.querySelector('[data-release-count]').textContent=String(count);}
  status.textContent=state.loading?'Consultando as próximas datas…':state.error?state.error:state.partial?'Algumas datas não puderam ser atualizadas. Você pode consultar novamente.':`${filtered.length} ${filtered.length===1?'lançamento futuro anunciado':'lançamentos futuros anunciados'}`;
  retry.hidden=!state.error&&!state.partial;retry.disabled=state.loading;more.hidden=visible.length>=filtered.length&&!state.hasMore;more.disabled=state.loading;more.textContent=state.loading?'Consultando…':visible.length<filtered.length?'Mostrar mais datas':'Ver mais lançamentos';
  const from=new Date(Date.parse(today()+'T00:00:00Z')+86400000).toISOString().slice(0,10);view.querySelector('[data-releases-from]').textContent=`A partir de ${prettyDate(from)}`;
  for(const button of results.querySelectorAll('[data-release-key]'))button.onclick=()=>{const event=state.events.get(button.dataset.releaseKey);if(event&&event.air_date>today())onOpen(event);};
 }
 async function load(page=state.page+1){
  if(destroyed||state.loading)return;state.loading=true;state.error='';const ticket=++version;render();
  try{
   const data=await api(`/api/catalog/releases?page=${page}`);if(destroyed||ticket!==version)return;
   if(dateValid(data.asOf)&&data.asOf>state.asOf)state.asOf=data.asOf;
   if(page===1)state.events.clear();
   for(const event of data.items||[]){if(!event||!Object.hasOwn(KIND_NAMES,event.kind)||!dateValid(event.air_date)||event.air_date<=today()||!Number.isSafeInteger(Number(event.anime?.id))||Number(event.anime.id)<1)continue;const key=String(event.key||`${event.anime.id}:${event.kind}:${event.season_number}:${event.episode_number}:${event.air_date}`);state.events.set(key,{...event,key});}
   state.page=Math.max(page,Number(data.page)||page);state.hasMore=data.hasMore===true;state.partial=data.partial===true;remember([...state.events.values()].map(event=>event.anime));
  }catch(error){if(!destroyed&&ticket===version)state.error=error?.message||'Não foi possível consultar as datas. Tente novamente.';}
  finally{if(!destroyed&&ticket===version){state.loading=false;render();}}
 }
 for(const filter of filters)filter.onclick=()=>{state.kind=filter.dataset.releaseKind;state.limit=48;render();};
 more.onclick=()=>{const filtered=currentEvents().filter(event=>state.kind==='all'||event.kind===state.kind);if(filtered.length>state.limit){state.limit+=48;render();}else void load();};
 retry.onclick=()=>{state.limit=48;void load(1);};
 const rollover=setInterval(()=>{if(!destroyed&&today()!==lastRenderedDay)render();},60000);
 const ready=load(1);
 return {ready,destroy(){destroyed=true;version++;clearInterval(rollover);filters.forEach(filter=>filter.onclick=null);more.onclick=null;retry.onclick=null;for(const button of results.querySelectorAll('[data-release-key]'))button.onclick=null;}};
}
