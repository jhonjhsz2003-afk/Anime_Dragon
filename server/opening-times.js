import {createCache} from './cache.js';

const MAX_DURATION=21600, MAX_EPISODE=100000;
const plainObject=value=>value&&typeof value==='object'&&!Array.isArray(value);
const positiveInteger=value=>Number.isSafeInteger(value)&&value>0&&value<=MAX_EPISODE;
const databaseId=value=>Number.isSafeInteger(value)&&value>0&&value<=1000000000;
function episodeRange(value){
 if(typeof value!=='string')return null;
 const match=/^([1-9]\d*)(?:-([1-9]\d*)?)?$/.exec(value);
 if(!match)return null;
 const start=Number(match[1]),end=value.includes('-')?(match[2]?Number(match[2]):Infinity):start;
 return positiveInteger(start)&&(end===Infinity||positiveInteger(end)&&end>=start)?{start,end}:null;
}
function mappedNumber(source,target,episode){
 if(typeof target!=='string')return null;
 const [segments,ratio,...extra]=target.split('|');
 // Merged/split episode ratios cannot identify a single matching video cut.
 if(extra.length||ratio!==undefined&&ratio!=='1')return null;
 const ranges=segments.split(',').map(episodeRange);
 if(!ranges.length||ranges.some(range=>!range))return null;
 if(source.end===Infinity){
  if(ranges.length!==1||ranges[0].end!==Infinity)return null;
  const mapped=ranges[0].start+episode-source.start;
  return positiveInteger(mapped)?mapped:null;
 }
 if(ranges.some(range=>range.end===Infinity))return null;
 const length=ranges.reduce((total,range)=>total+range.end-range.start+1,0);
 if(length!==source.end-source.start+1)return null;
 let offset=episode-source.start;
 for(const range of ranges){const size=range.end-range.start+1;if(offset<size)return range.start+offset;offset-=size;}
 return null;
}

// Use explicit season-scoped episode mappings, never title search or MAL season guesses.
// A closed snapshot must still match the catalog's complete season length.
export function exactOpeningEpisode(mappings,anime,season,episode){
 if(!databaseId(anime?.id)||!Number.isInteger(season)||season<0||season>1000||!positiveInteger(episode))return null;
 const count=Number(anime.seasons?.find(row=>row.season_number===season)?.episode_count);
 if(!positiveInteger(count)||episode>count)return null;
 const targets=mappings?.[`tmdb_show:${anime.id}:s${season}`];
 if(!plainObject(targets))return null;
 let maximum=0,open=false,invalid=false;const matches=new Map();
 for(const [descriptor,relations]of Object.entries(targets)){
  const mal=/^mal:([1-9]\d*)$/.exec(descriptor);
  if(!mal||!databaseId(Number(mal[1]))||!plainObject(relations))continue;
  for(const [from,to]of Object.entries(relations)){
   const range=episodeRange(from);
   if(!range){invalid=true;continue;}
   if(range.end===Infinity)open=true;else maximum=Math.max(maximum,range.end);
   if(episode<range.start||episode>range.end)continue;
   const number=mappedNumber(range,to,episode);
   if(!number){invalid=true;continue;}
   const match={malId:Number(mal[1]),episode:number};matches.set(`${match.malId}:${number}`,match);
  }
 }
 if(invalid||!open&&maximum!==count||open&&maximum>count||matches.size!==1)return null;
 return matches.values().next().value;
}

export function validatedOpening(payload,duration){
 if(typeof duration!=='number'||!Number.isFinite(duration)||duration<60||duration>MAX_DURATION)return null;
 if(!plainObject(payload)||payload.found!==true||!Array.isArray(payload.results)||payload.results.length>32)return null;
 const candidates=[];
 for(const row of payload.results){
  if(row?.skipType!=='op')continue;
  const start=row.interval?.startTime,end=row.interval?.endTime,length=row.episodeLength;
  if(![start,end,length].every(value=>typeof value==='number'&&Number.isFinite(value)))continue;
  // Do not scale/offset another edit's timestamps; the API can return a different duration.
  if(Math.abs(length-duration)>1||start<0||end<=start||end>=duration||end-start<10||end-start>300)continue;
  candidates.push({start,end,episodeLength:length});
 }
 if(!candidates.length)return null;
 const first=candidates[0];
 // Conflicting community records are ambiguous even when their durations agree.
 if(candidates.some(row=>Math.abs(row.start-first.start)>.5||Math.abs(row.end-first.end)>.5))return null;
 return first;
}

export function createOpeningTimes({fetcher=(...args)=>fetch(...args),timeoutMs=2500}={}){
 const assets=createCache(4),times=createCache(256);let active=0;
 const empty=reason=>({ok:true,opening:null,provider:'AniSkip',...(reason?{reason}:{})});
 return async function({anime,season,episode,duration,env,origin}){
  if(typeof duration!=='number'||!Number.isFinite(duration)||duration<60||duration>MAX_DURATION)return empty('duration');
  if(!env?.ASSETS?.fetch)return empty('mapping');
  let snapshot;
  try{
   const assetUrl=new URL('/opening-mappings.json',origin).href;
   snapshot=await assets.get(assetUrl,3600000,async()=>{
    const response=await env.ASSETS.fetch(new Request(assetUrl));
    if(!response.ok)throw Error('mapping');
    const body=await response.text();if(body.length>1000000)throw Error('mapping');
    const data=JSON.parse(body);
    if(data?.schema!==1||!plainObject(data.mappings)||Object.keys(data.mappings).length>10000)throw Error('mapping');
    return data;
   });
  }catch{return empty('mapping');}
  const match=exactOpeningEpisode(snapshot.mappings,anime,season,episode);
  if(!match)return empty('mapping');
  const seconds=duration.toFixed(3),key=`${match.malId}:${match.episode}:${duration}`;
  try{return await times.get(key,300000,async()=>{
   if(active>=8)throw Error('busy');
   active++;
   try{
    const url=new URL(`https://api.aniskip.com/v2/skip-times/${match.malId}/${match.episode}`);
    url.searchParams.set('types','op');url.searchParams.set('episodeLength',seconds);
    const response=await fetcher(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(timeoutMs)});
    if(!response.ok)throw Error('unavailable');
    const body=await response.text();if(body.length>65536)throw Error('unavailable');
    const opening=validatedOpening(JSON.parse(body),duration);
    return opening?{ok:true,opening,provider:'AniSkip',malId:match.malId,episode:match.episode}:empty('unavailable');
   }finally{active--;}
  });}catch{return empty('unavailable');}
 };
}
export const openingTimes=createOpeningTimes();
