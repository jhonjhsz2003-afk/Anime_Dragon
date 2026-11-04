import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateIdentity,profileIdentity} from '../server/profile-identity.js';
import {providers} from '../server/providers.js';
import {episodeEmbedUrl} from '../server/embedmovies.js';
import {contentSecurityPolicy} from '../server/media-policy.js';
const txt=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('v28: only EmbedMovies is present in playback providers, scripts and CSP',()=>{
 assert.deepEqual(providers().map(x=>x.id),['embedmovies']);
 assert.equal(episodeEmbedUrl(30984,1,3),'https://myembed.biz/serie/30984/1/3');
 assert.doesNotMatch(contentSecurityPolicy(),/akumast/);
 assert.doesNotMatch(txt('web/_headers'),/akumast|shaka-player/);
 assert.doesNotMatch(txt('worker.js'),/animefirePlayback|animefireEnabled/);
 assert.doesNotMatch(txt('web/js/sources.js'),/animefire/i);
});
test('v28: future TMDB dates do not disable listed episodes',()=>{
 const app=txt('web/js/app.js'),player=txt('web/js/player.js');
 assert.match(app,/state\.episodes\.filter\(e=>Number\(e\.episode_number\)>0\)/);
 assert.match(player,/availableEpisodes=o\.episodes\.filter\(x=>Number\(x\.episode_number\)>0\)/);
 assert.doesNotMatch(app,/future\?'disabled'/);
 assert.doesNotMatch(player,/future\?'disabled'/);
 assert.match(app,/Data prevista:/);
});
test('v28: collection profile is explicit and history stays out of saved gallery',()=>{
 const app=txt('web/js/app.js');
 assert.match(app,/const ids=\[\.\.\.new Set\(entries\.map\(row=>Number\(row\.anime_id\)\)\)\]/);
 assert.match(app,/const groups=\[\['favorite','Favoritos'\],\['watchlater','Minha lista'\],\['watching','Acompanhando'\]\]/);
 assert.match(app,/profile-minimal-card/);
 assert.doesNotMatch(app,/groups=\[\['all','Todos'\],\['watching'/);
});
test('v28: supports exactly 30 new original frames with migration for old settings',()=>{
 const css=txt('web/css/profile-v28.css');
 const matches=[...css.matchAll(/^\.identity-ring-([a-z-]+)\{--frame-a:/gm)].map(x=>x[1]);
 assert.equal(matches.length,30);assert.equal(new Set(matches).size,30);
 for(const frame of matches){
  const value=validateIdentity({cover:'nebula',frame,title:'Explorador de universos'},{profile_cover:'aurora',profile_frame:'flame'});
  assert.equal(value.frame,frame);
 }
 assert.equal(profileIdentity({profile_cover:'aurora',profile_frame:'flame'}).frame,'azure-dragon');
 assert.equal(profileIdentity({profile_cover:'aurora',profile_frame:'plain'}).frame,'onyx');
});
test('v28: 13 solid palettes plus animated RGB gradients respect reduced motion',()=>{
 const app=txt('web/js/app.js');const css=txt('web/css/profile-v28.css');
 assert.match(app,/13 cores clássicas e 14 RGB animadas/);
 assert.equal((app.match(/'RGB [^']+'|"RGB [^"]+"/g)||[]).length>=14,true);
 assert.match(css,/@keyframes profile-rgb-flow/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
