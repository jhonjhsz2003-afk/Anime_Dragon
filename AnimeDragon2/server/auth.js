import { database } from './database.js';

// Passwords and session tokens never leave the server or enter localStorage.

const enc = new TextEncoder();

const hex = bytes => [...new Uint8Array(bytes)].map(v=>v.toString(16).padStart(2,'0')).join('');

const random = n => hex(crypto.getRandomValues(new Uint8Array(n)));

const error = (status,message) => Object.assign(new Error(message),{status});

const reply = (data,status=200,headers={}) => new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers}});

const digest = async s => hex(await crypto.subtle.digest('SHA-256',enc.encode(s)));

const avatar = a => /^\/assets\/avatars\/avatar-([1-9]|1[0-2])(-animated)?\.svg$/.test(a || '') || /^\/api\/avatar\/[a-zA-Z0-9-]{1,80}\?v=[a-zA-Z0-9-]+$/.test(a||'') ? a : '/assets/avatar-default.svg';

const publicUser = u => ({id:String(u.id),name:u.username,email:u.email,bio:u.bio || '',avatar:avatar(u.avatar_url),visibility:u.visibility||'private',nameColor:u.name_color||'ice',avatarFrame:{x:u.avatar_x??50,y:u.avatar_y??50,zoom:u.avatar_zoom??100}});

async function hmac(text,secret) {

  const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);

  return hex(await crypto.subtle.sign('HMAC',key,enc.encode(text)));

}

export async function passwordHash(password,salt,secret) {

  // Worker's WebCrypto PBKDF2 supports up to 100,000 iterations. A separate,

  // mandatory server secret peppers the input; hashes are versioned for migration.

  const peppered=await hmac(password,secret);

  const key=await crypto.subtle.importKey('raw',enc.encode(peppered),'PBKDF2',false,['deriveBits']);

  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:100000,hash:'SHA-512'},key,256);

  return 'v1$'+hex(bits);

}

export function equal(a,b) { if(a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0; }

export async function throttle(env,key,limit) {

  const bucket=Math.floor(Date.now()/900000);

  const id=await hmac(`${key}:${bucket}`,env.AUTH_SECRET);

  const result=await env.DB.prepare('INSERT INTO auth_limits (id, attempts, expires_at) VALUES (?, 1, ?) ON CONFLICT(id) DO UPDATE SET attempts=attempts+1 RETURNING attempts').bind(id,Date.now()+1800000).first();

  if(result.attempts>limit)throw error(429,'Muitas tentativas. Aguarde 15 minutos e tente novamente.');

}

const tokenFrom = r => r.headers.get('Cookie')?.match(/(?:^|;\s*)ad_session=([a-f0-9]{64})(?:;|$)/)?.[1];

export async function getUser(r,env) {

  const token=tokenFrom(r);if(!token)return null;

  const user=await env.DB.prepare(`SELECT users.*,COALESCE(profile_privacy.visibility,'private') visibility,COALESCE(user_appearance.name_color,'ice') name_color,pm.x avatar_x,pm.y avatar_y,pm.zoom avatar_zoom FROM sessions JOIN users ON users.id=sessions.user_id LEFT JOIN profile_privacy ON profile_privacy.user_id=users.id LEFT JOIN user_appearance ON user_appearance.user_id=users.id LEFT JOIN profile_media pm ON pm.user_id=users.id WHERE sessions.${env.AUTH_LAYOUT.sessionKey}=? AND sessions.expires_at>?`).bind(await digest(token),new Date().toISOString()).first();
  return user&&!user.blocked?{...user,id:String(user.id)}:null;

}

const cookie = (r,token,age) => `ad_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${new URL(r.url).protocol==='https:'?'; Secure':''}`;

async function createSession(r,env,u) {

  const token=random(32),now=new Date(),expires=new Date(now.getTime()+604800000);

  const old=tokenFrom(r);

  const statements=[env.DB.prepare(`INSERT INTO sessions(${env.AUTH_LAYOUT.sessionKey},user_id,expires_at,created_at) VALUES(?,?,?,?)`).bind(await digest(token),u.id,expires.toISOString(),now.toISOString())];

  if(old)statements.push(env.DB.prepare(`DELETE FROM sessions WHERE ${env.AUTH_LAYOUT.sessionKey}=?`).bind(await digest(old)));

  await env.DB.batch(statements);

  return reply({ok:true,user:publicUser(u)},200,{'Set-Cookie':cookie(r,token,604800)});

}

export async function auth(request,env) {

  env=await database(env);

  const path=new URL(request.url).pathname;

  if(request.method==='GET' && path==='/api/auth/me')return reply({ok:true,user:((u)=>u?publicUser(u):null)(await getUser(request,env))});

  if(request.method!=='POST')throw error(405,'Método não permitido.');

  if(request.headers.get('Origin')!==new URL(request.url).origin)throw error(403,'Origem da solicitação inválida.');

  if(!request.headers.get('Content-Type')?.includes('application/json'))throw error(415,'Formato inválido.');

  const text=await request.text();if(text.length>4096)throw error(413,'Solicitação muito grande.');

  let data;try{data=JSON.parse(text)}catch{throw error(400,'Dados inválidos.');}

  if(!data || typeof data!=='object' || Array.isArray(data))throw error(400,'Dados inválidos.');

  if(path==='/api/auth/logout') {

    const t=tokenFrom(request);if(t)await env.DB.prepare(`DELETE FROM sessions WHERE ${env.AUTH_LAYOUT.sessionKey}=?`).bind(await digest(t)).run();

    return reply({ok:true},200,{'Set-Cookie':cookie(request,'',0)});

  }

  if(path==='/api/auth/privacy') {

    const u=await getUser(request,env);if(!u)throw error(401,'Entre na sua conta para continuar.');

    if(!['private','public'].includes(data.visibility))throw error(400,'Escolha público ou privado.');

    await env.DB.prepare('INSERT INTO profile_privacy VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET visibility=excluded.visibility').bind(u.id,data.visibility).run();

    return reply({ok:true,user:publicUser({...u,visibility:data.visibility})});

  }

  if(path==='/api/auth/profile') {

    const u=await getUser(request,env);if(!u)throw error(401,'Entre na sua conta para continuar.');

    const name=String(data.name || '').trim(), bio=String(data.bio || '').trim();

    if(!/^[\p{L}\p{N}_ -]{3,30}$/u.test(name) || bio.length>300)throw error(400,'Use um nome de 3 a 30 caracteres e uma bio de até 300.');

    const nameColor=data.nameColor??u.name_color??'ice';

    if(!['ice','blue','cyan','green','gold','orange','pink','violet'].includes(nameColor))throw error(400,'Escolha uma das cores disponíveis.');

    if(env.AUTH_LAYOUT.legacyNames&&await env.DB.prepare('SELECT id FROM users WHERE username=? AND id<>? LIMIT 1').bind(name,u.id).first())throw error(409,'Esse nome já está em uso.');

    try {await env.DB.batch([env.DB.prepare('UPDATE users SET username=?,bio=?,avatar_url=?,updated_at=? WHERE id=?').bind(name,bio,avatar(u.avatar_url),new Date().toISOString(),u.id),env.DB.prepare('INSERT INTO user_appearance VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET name_color=excluded.name_color').bind(u.id,nameColor)]);}

    catch(e){if(String(e.message).includes('UNIQUE'))throw error(409,'Esse nome já está em uso.');throw e;}

    return reply({ok:true,user:publicUser({...u,username:name,bio,avatar_url:avatar(u.avatar_url),name_color:nameColor})});

  }

  if(!['/api/auth/register','/api/auth/login'].includes(path))throw error(404,'Página não encontrada.');

  await throttle(env,`ip:${request.headers.get('CF-Connecting-IP') || 'local'}`,20);

  const email=String(data.email || '').trim().toLowerCase(), password=String(data.password || '');

  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||password.length>128)throw error(400,'Confira seu e-mail e sua senha.');

  await throttle(env,`email:${email}`,10);

  if(path==='/api/auth/login') {

    const u=await env.DB.prepare(`SELECT users.*,COALESCE(profile_privacy.visibility,'private') visibility,COALESCE(user_appearance.name_color,'ice') name_color,pm.x avatar_x,pm.y avatar_y,pm.zoom avatar_zoom FROM users LEFT JOIN profile_privacy ON profile_privacy.user_id=users.id LEFT JOIN user_appearance ON user_appearance.user_id=users.id LEFT JOIN profile_media pm ON pm.user_id=users.id WHERE email=?`).bind(email).first();

    const hash=await passwordHash(password,u?.password_salt || 'unknown-account-salt',env.AUTH_SECRET);

    if(!u||!u.password_salt||!equal(hash,u.password_hash))throw error(401,'E-mail ou senha incorretos.');
    if(u.blocked)throw error(403,'Esta conta está bloqueada. Entre em contato com o administrador.');

    return createSession(request,env,u);

  }

  const name=String(data.name || '').trim();

  if(!/^[\p{L}\p{N}_ -]{3,30}$/u.test(name))throw error(400,'Use um nome de 3 a 30 letras, números, espaços ou traços.');

  if(password.length<12)throw error(400,'Sua senha precisa ter pelo menos 12 caracteres.');

  const salt=random(16),now=new Date().toISOString();

  const u={id:crypto.randomUUID(),username:name,email,avatar_url:avatar(data.avatar),bio:''};

  const hash=await passwordHash(password,salt,env.AUTH_SECRET);

  if(env.AUTH_LAYOUT.legacyNames&&await env.DB.prepare('SELECT id FROM users WHERE username=? LIMIT 1').bind(name).first())throw error(409,'Esse nome já está em uso.');
  const fields=['username','email','password_hash','password_salt','avatar_url','created_at','updated_at'];
  const values=[name,email,hash,salt,u.avatar_url,now,now];
  if(!env.AUTH_LAYOUT.integerUsers){fields.unshift('id');values.unshift(u.id);}
  if(env.AUTH_LAYOUT.legacyNames){fields.push('display_name','avatar');values.push(name,u.avatar_url);}
  try {
    const created=await env.DB.prepare(`INSERT INTO users(${fields.join(',')}) VALUES(${fields.map(()=>'?').join(',')}) RETURNING id`).bind(...values).first();
    u.id=String(created.id);
  }

  catch(e){if(String(e.message).includes('UNIQUE'))throw error(409,'Nome ou e-mail já cadastrado. Entre na sua conta ou use outros dados.');throw e;}

  return createSession(request,env,u);

}

export async function cleanupSessions(env) {

  env=await database(env);

  return env.DB.batch([

    env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(new Date().toISOString()),

    env.DB.prepare('DELETE FROM auth_limits WHERE expires_at < ?').bind(Date.now())

  ]);

}

