// Store the provider ID and framing only. GIPHY media is resolved in the browser,
// never copied into D1, proxied by the Worker, or retained in catalog storage.
const marker=/^giphy:([a-zA-Z0-9]{1,80})(?:\?x=(\d+(?:\.\d+)?)&y=(\d+(?:\.\d+)?)&zoom=(\d+(?:\.\d+)?))?$/;
export function giphyAvatar(value){
 const match=marker.exec(value||'');if(!match)return null;
 const frame={x:Number(match[2]??50),y:Number(match[3]??50),zoom:Number(match[4]??100)};
 if(frame.x>100||frame.y>100||frame.zoom<100||frame.zoom>300)return null;
 return {id:match[1],frame};
}
export function giphyMarker(id,frame={x:50,y:50,zoom:100}){
 if(typeof id!=='string'||! /^[a-zA-Z0-9]{1,80}$/.test(id))return null;
 const value=`giphy:${id}?x=${frame.x}&y=${frame.y}&zoom=${frame.zoom}`;
 return giphyAvatar(value)?value:null;
}
export function storedAvatarFrame(user){return giphyAvatar(user.avatar_url)?.frame||{x:user.avatar_x??50,y:user.avatar_y??50,zoom:user.avatar_zoom??100};}
export function giphyConfig(env){
 const key=String(env.GIPHY_API_KEY||'').trim();
 // A Web API key is public by design: client requests are required by GIPHY.
 // No TMDB, authentication, or other Worker credentials are exposed here.
 return {ok:true,configured:!!key,apiKey:key||null,rating:'pg-13'};
}
