import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {directEpisodeEmbed,isEmbedMoviesEmbed} from '../web/js/sources.js';
import {validateIdentity} from '../server/profile-identity.js';
import {localStickerPaths} from '../server/local-media-index.js';
import worker from '../worker.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('v33: episodio direto validado localmente e sem selecao inventada de players',()=>{
 const direct=directEpisodeEmbed(30984,1,3);
 assert.equal(direct.url,'https://myembed.biz/serie/30984/1/3');
 assert.equal(isEmbedMoviesEmbed(direct),true);
 for(const item of [[-1,1,1],[0,1,1],[12,1,-1],[12,1001,1],[12,1,10001],['12?x=1',1,1],[12,'1/2',1]])assert.equal(directEpisodeEmbed(...item),null);
 assert.match(read('web/js/app.js'),/onUpdate\?\.\(\{ok:true,available:true,streams:\[first\],complete:false/);
 assert.match(read('web/js/player.js'),/frame\.setAttribute\('allow','fullscreen; autoplay; encrypted-media; picture-in-picture'\)/);
});

test('v33: seis stickers com coordenadas validas e nome verdadeiro em vez de titulo',()=>{
 const js=read('web/js/app.js'),css=read('web/css/refinements-v33.css');
 assert.match(js,/const positions=\[\[18,28\],\[50,28\],\[82,28\],\[18,72\],\[50,72\],\[82,72\]\]/);
 assert.doesNotMatch(js,/Seu título pessoal/);
 assert.match(js,/<h2 class="profile-display-name">\$\{styledName\(state\.user\.name,state\.user\.nameColor\)\}/);
 assert.match(css,/\.home-view \.cards:not\(\.continue-cards\)/);
 assert.match(css,/\.home-view \.hero, \.home-view \.rotating-hero/);
 const ids=Array.from({length:6},(_,i)=>`/assets/profile-media/Stickers/v33-${i}.webp`);
 ids.forEach(id=>localStickerPaths.add(id));
 const pos=[[18,28],[50,28],[82,28],[18,72],[50,72],[82,72]];
 const stickers=ids.map((id,i)=>({id,x:pos[i][0],y:pos[i][1],size:17}));
 const current={profile_cover:'aurora',profile_frame:'stardust',profile_title:'Explorador',profile_stickers:'[]'};
 assert.deepEqual(validateIdentity({stickers},current).stickers,stickers);
 assert.throws(()=>validateIdentity({stickers:[...stickers,{...stickers[0]}]},current),/seis stickers/);
});

test('v33: servidor salva exatamente seis stickers e devolve o perfil corretamente',async()=>{
 const db=new DatabaseSync(':memory:');
 const DB={prepare(sql){let args=[];return {bind(...v){args=v;return this},async first(){return db.prepare(sql).get(...args)||null},async all(){return {results:db.prepare(sql).all(...args)}},async run(){return db.prepare(sql).run(...args)}}},async batch(stmts){db.exec('BEGIN');try{const out=[];for(const stmt of stmts)out.push(await stmt.run());db.exec('COMMIT');return out}catch(e){db.exec('ROLLBACK');throw e}}};
 const env={DB,AUTH_SECRET:'secret-password-v33-robust-12345'};
 const request=(path,data,cookie)=>worker.fetch(new Request('https://animedragon.test'+path,{method:data?'POST':'GET',headers:{Origin:'https://animedragon.test','Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(data?{body:JSON.stringify(data)}:{})}),env,{});
 const registration=await request('/api/auth/register',{name:'Exemplo',email:'sticker-six-v33@example.test',password:'senha-segura-123456'});
 assert.equal(registration.status,200);
 const cookie=registration.headers.get('Set-Cookie');
 const ids=Array.from({length:6},(_,i)=>`/assets/profile-media/Stickers/ok-v33-${i}.webp`);
 ids.forEach(id=>localStickerPaths.add(id));
 const positions=[[18,28],[50,28],[82,28],[18,72],[50,72],[82,72]];
 const stickers=ids.map((id,i)=>({id,x:positions[i][0],y:positions[i][1],size:17}));
 const response=await request('/api/auth/profile',{name:'Exemplo',bio:'',identity:{cover:'aurora',frame:'stardust',title:'Perfil',stickers}},cookie);
 assert.equal(response.status,200,await response.clone().text());
 assert.deepEqual((await response.json()).user.identity.stickers,stickers);
 assert.deepEqual((await(await request('/api/auth/me',null,cookie)).json()).user.identity.stickers,stickers);
});
