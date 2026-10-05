// Explicit local preview fixtures. Never imported by the production Worker.
const demoKeywordNames=['isekai','magic','based on light novel','romance','school life','slice of life','mecha','sports','supernatural','based on manga','samurai','shounen','science fiction'];
const demoTags=[[0,1,2,11],[9,10,11],[3,12],[1,5,8],[6,12],[3,4,7],[6,11,12],[5,9]];
const titles=['Crônicas de Aether','Ronin: última aurora','Além das estrelas','O jardim dos espíritos','Cidade de neon','A promessa do oceano','Asas do crepúsculo','Lendas de Kintsugi'];
const overviews=[
  'Quando os dragões desaparecem do céu, uma jovem guardiã encontra um ovo de cristal. Para proteger o último sopro de magia, ela precisa atravessar um mundo que esqueceu como sonhar.',
  'Um espadachim sem mestre retorna à cidade onde jurou nunca mais lutar. Entre lanternas e segredos, uma última promessa mudará o destino do império.',
  'Dois desconhecidos recebem a mesma mensagem, enviada por uma estrela que deixou de existir. Uma viagem sobre encontros, distância e tudo o que nos conecta.',
  'Em um jardim onde as estações obedecem às emoções, uma aprendiz descobre que até os espíritos precisam aprender a se despedir.',
  'Nas ruas de uma metrópole que nunca dorme, um entregador encontra uma memória capaz de desligar a cidade inteira.',
  'Uma cartógrafa e um viajante seguem uma canção pelo oceano. No horizonte, uma ilha aparece apenas para quem tem algo a encontrar.',
  'Acima de um mundo coberto por névoa, jovens pilotos defendem a última cidade flutuante e seus sonhos impossíveis.',
  'Uma artesã repara objetos quebrados com ouro. Mas cada peça restaurada revela uma história que alguém tentou esquecer.'
];
const previewToday=new Date();
const dateAt=days=>new Date(previewToday.getTime()+days*86400000).toISOString().slice(0,10);
const metadata=(id,name,art,index)=>({
  id,name,title:name,media_type:'tv',genre_ids:[16,10759,10765],
  demo_keywords:demoTags[index].map(n=>910000+n),origin_country:['JP'],adult:false,
  poster_path:`/assets/demo/poster-${art}.svg`,backdrop_path:`/assets/demo/backdrop-${art}.svg`,
  genres:[{id:16,name:'Animação'},{id:10765,name:'Fantasia'}]
});

export const demoItems=titles.map((name,i)=>({
  ...metadata(900001+i,name,i+1,i),overview:overviews[i],vote_average:8.9-i*.15,vote_count:400-i*20,popularity:100-i*8,
  first_air_date:dateAt(-(i%7)-(4+i)*7),status:i===7?'Ended':'Returning Series',number_of_episodes:12,
  seasons:[{season_number:1,episode_count:12}],
  last_episode_to_air:{air_date:dateAt(-(i%7)),season_number:1,episode_number:5+i,name:'Ecos do horizonte'},
  next_episode_to_air:i===7?null:{air_date:dateAt(7-(i%7)),season_number:1,episode_number:6+i,name:'O próximo horizonte'}
}));

// Separate future series keep upcoming cards distinct from the aired preview titles.
export const demoUpcomingItems=['O mapa das constelações','Guardião da primavera','Além do portal azul','A cidade entre nuvens'].map((name,i)=>({
  ...metadata(900101+i,name,i+1,i),overview:'Título original ilustrativo para a prévia local da seção de próximas estreias.',
  vote_average:0,vote_count:0,popularity:20-i,first_air_date:dateAt(14+i*21),status:'Planned',
  number_of_episodes:0,seasons:[],last_episode_to_air:null,next_episode_to_air:null
}));
const allItems=[...demoItems,...demoUpcomingItems];

export function demoResponse(url){
  const u=new URL(url),params=u.searchParams,id=Number(u.pathname.match(/\/tv\/(\d+)/)?.[1]);
  if(u.pathname==='/3/search/keyword'){
    const name=params.get('query'),index=demoKeywordNames.indexOf(name);
    return Response.json({results:index<0?[]:[{id:910000+index,name}]});
  }
  const item=allItems.find(p=>p.id===id);
  if(u.pathname.includes('/season/')){
    const episodes=item?.seasons.some(s=>s.season_number===1)?Array.from({length:12},(_,i)=>({
      episode_number:i+1,season_number:1,
      name:['O começo da jornada','Um encontro inesperado','Ecos do passado','Do outro lado','A promessa','O céu se abre'][i%6],
      runtime:24,
      air_date:dateAt(-(demoItems.indexOf(item)%7)+(i+1-item.last_episode_to_air.episode_number)*7),
      still_path:item.backdrop_path
    })):[];
    return Response.json({episodes});
  }
  if(id&&!u.pathname.endsWith('/recommendations'))return item?Response.json(item):Response.json({}, {status:404});
  const query=params.get('query')?.toLowerCase();
  let results=query?allItems.filter(p=>p.name.toLowerCase().includes(query)):allItems;
  if(params.has('with_keywords'))results=results.filter(p=>p.demo_keywords.includes(Number(params.get('with_keywords'))));
  for(const [key,read] of [['first_air_date',p=>p.first_air_date],['air_date',p=>p.last_episode_to_air?.air_date]]){
    const lower=params.get(`${key}.gte`),upper=params.get(`${key}.lte`);
    if(lower||upper)results=results.filter(p=>{
      const date=read(p);
      return Boolean(date)&&(!lower||date>=lower)&&(!upper||date<=upper);
    });
  }
  if(params.has('vote_count.gte'))results=results.filter(p=>p.vote_count>=Number(params.get('vote_count.gte')));
  const sorts={
    'popularity.desc':(a,b)=>b.popularity-a.popularity,
    'vote_average.desc':(a,b)=>b.vote_average-a.vote_average,
    'first_air_date.desc':(a,b)=>b.first_air_date.localeCompare(a.first_air_date),
    'first_air_date.asc':(a,b)=>a.first_air_date.localeCompare(b.first_air_date)
  };
  if(sorts[params.get('sort_by')])results=[...results].sort(sorts[params.get('sort_by')]);
  return Response.json({page:1,total_pages:results.length?1:0,results});
}
