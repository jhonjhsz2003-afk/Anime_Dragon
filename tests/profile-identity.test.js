import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import worker from '../worker.js';

function fixture(){
 const sqlite=new DatabaseSync(':memory:');
 const DB={sqlite,prepare(sql){let args=[];return {bind(...values){args=values;return this},async first(){return sqlite.prepare(sql).get(...args)||null},async all(){return {results:sqlite.prepare(sql).all(...args)}},async run(){return sqlite.prepare(sql).run(...args)}}},async batch(statements){sqlite.exec('BEGIN');try{const result=[];for(const statement of statements)result.push(await statement.run());sqlite.exec('COMMIT');return result}catch(error){sqlite.exec('ROLLBACK');throw error}}};
 const env={DB,AUTH_SECRET:'profile-identity-test-secret-preserve-12345'};
 const call=(path,data,cookie,customEnv=env)=>worker.fetch(new Request('https://profile.test'+path,{method:data?'POST':'GET',headers:{Origin:'https://profile.test','Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(data?{body:JSON.stringify(data)}:{})}),customEnv,{});
 return {DB,env,call};
}

test('profile identity persists through restart and login while credentials remain unchanged',async()=>{
 const t=fixture(),details={name:'Guardiao',email:'guardiao@example.com',password:'uma-senha-longa-123'};
 const registration=await t.call('/api/auth/register',details);assert.equal(registration.status,200);
 const user=(await registration.json()).user,cookie=registration.headers.get('Set-Cookie');
 const original=t.DB.sqlite.prepare('SELECT password_hash,password_salt FROM users WHERE id=?').get(user.id);
 const identity={cover:'nebula',frame:'halo',title:'Guardião das madrugadas'};
 const save=await t.call('/api/auth/profile',{name:details.name,bio:'Cada episódio, um universo.',nameColor:'violet',identity},cookie);
 assert.equal(save.status,200);assert.deepEqual((await save.json()).user.identity,identity);
 const restarted={...t.env,DB:{...t.DB}};
 assert.deepEqual((await(await t.call('/api/auth/me',null,cookie,restarted)).json()).user.identity,identity);
 await t.call('/api/auth/privacy',{visibility:'public'},cookie);
 const profile=(await(await t.call('/api/community/profile/'+user.id)).json()).profile;
 assert.deepEqual(profile.identity,identity);assert.equal(profile.email,undefined);
 await t.call('/api/auth/logout',{},cookie);assert.equal((await(await t.call('/api/auth/me',null,cookie)).json()).user,null);
 const login=await t.call('/api/auth/login',details);assert.equal(login.status,200);assert.deepEqual((await login.json()).user.identity,identity);
 assert.deepEqual(t.DB.sqlite.prepare('SELECT password_hash,password_salt FROM users WHERE id=?').get(user.id),original);
});

test('profile identity rejects unknown styles and markup atomically and never changes another account',async()=>{
 const t=fixture(),data={name:'Explorador',email:'owner@example.com',password:'uma-senha-longa-123'};
 const registration=await t.call('/api/auth/register',data),cookie=registration.headers.get('Set-Cookie');
 for(const identity of [{cover:'red;position:fixed',frame:'flame',title:'Teste'},{cover:'aurora',frame:'javascript:evil',title:'Teste'},{cover:'aurora',frame:'flame',title:'<script>Teste</script>'},{cover:'aurora',frame:'flame',title:'x'}])assert.equal((await t.call('/api/auth/profile',{name:'Nome alterado',bio:'Alterada',identity},cookie)).status,400);
 const me=(await(await t.call('/api/auth/me',null,cookie)).json()).user;assert.equal(me.name,data.name);assert.equal(me.bio,'');assert.equal(me.identity.cover,'aurora');
 assert.equal((await t.call('/api/auth/profile',{name:data.name,bio:'',identity:{cover:'moon',frame:'plain',title:'Sem conexão'}})).status,401);
});
