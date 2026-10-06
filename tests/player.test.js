import test from 'node:test';
import assert from 'node:assert/strict';
import {streamMime} from '../server/addon.js';
import {clockTime,playbackError} from '../web/js/player.js';

test('opaque streams are not falsely advertised as MP4; query strings do not change the container',()=>{
 assert.equal(streamMime('https://provider.example/stream/59649?hash=example'),'');
 assert.equal(streamMime('https://provider.example/movie.MKV?token=example'),'video/x-matroska');
 assert.equal(streamMime('https://provider.example/master.m3u8?name=video.mp4'),'application/vnd.apple.mpegurl');
 assert.equal(streamMime('https://provider.example/movie.mp4'),'video/mp4');
 assert.equal(streamMime('https://provider.example/movie.webm'),'video/webm');
});
test('player time handles long episodes and error messages distinguish network from decoding',()=>{
 assert.equal(clockTime(3661),'1:01:01');assert.equal(clockTime(-5),'0:00');assert.equal(clockTime(83.5),'1:23');
 assert.match(playbackError(2),/conexão/);assert.match(playbackError(3),/decodificar/);assert.match(playbackError(4),/incompatível/);
});
