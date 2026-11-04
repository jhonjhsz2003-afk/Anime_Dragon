import test from 'node:test';
import assert from 'node:assert/strict';
import {episodeEmbedUrl,embedMoviesPlayback} from '../server/embedmovies.js';
import {clockTime,playbackError} from '../web/js/player.js';

test('player para séries/animes usa apenas identificadores numéricos do TMDB',()=>{
 assert.equal(episodeEmbedUrl(30984,1,1),'https://myembed.biz/serie/30984/1/1');
 assert.equal(episodeEmbedUrl(30984,0,2),'https://myembed.biz/serie/30984/0/2');
 for(const tuple of [['tt42',1,1],['https://evil',1,1],[1,2,'-1'],[1,1001,1],[1,1,0]])assert.equal(episodeEmbedUrl(...tuple),null);
 assert.equal(embedMoviesPlayback({id:30984},1,1).streams[0].kind,'embed');
});
test('player time handles long episodes and error messages distinguish network from decoding',()=>{
 assert.equal(clockTime(3661),'1:01:01');assert.equal(clockTime(-5),'0:00');assert.equal(clockTime(83.5),'1:23');
 assert.match(playbackError(2),/conexão/);assert.match(playbackError(3),/decodificar/);assert.match(playbackError(4),/incompatível/);
});
