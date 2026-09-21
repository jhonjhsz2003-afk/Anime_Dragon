const ready = new WeakMap();

// Inspect the actual D1 tables: CREATE TABLE IF NOT EXISTS does not upgrade
// the older display_name/INTEGER schema. Never replace tables or rewrite hashes.
async function authLayout(db,retries=1) {
  const columns=await db.prepare('PRAGMA table_info(users)').all();
  const names=new Set(columns.results.map(c=>c.name));
  const sessions=await db.prepare('PRAGMA table_info(sessions)').all();
  const sessionNames=new Set(sessions.results.map(c=>c.name));
  const legacyNames=names.has('display_name');
  if(legacyNames){
    const definitions={username:'TEXT',password_salt:'TEXT',avatar_url:'TEXT',bio:"TEXT DEFAULT ''",updated_at:'TEXT'};
    const missing=Object.entries(definitions).filter(([name])=>!names.has(name));
    if(missing.length){
      try{await db.batch(missing.map(([name,type])=>db.prepare(`ALTER TABLE users ADD COLUMN ${name} ${type}`)));}
      catch(e){
        // Another isolate may have applied the same additive migration first.
        if(!retries||!/duplicate column name/i.test(String(e.message)+' '+String(e.cause?.message)))throw e;
        return authLayout(db,retries-1);
      }
    }
    const migrated=await db.prepare("SELECT value FROM app_config WHERE key='auth_legacy_v93'").first();
    if(missing.length||!migrated)await db.batch([
      db.prepare("UPDATE users SET username=COALESCE(username,display_name),avatar_url=COALESCE(avatar_url,avatar),updated_at=COALESCE(updated_at,created_at) WHERE username IS NULL OR avatar_url IS NULL OR updated_at IS NULL"),
      // Historical display names may repeat. Preserve them, while enforcing
      // uniqueness atomically for accounts using the current password format.
      db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS users_username_v93 ON users(username) WHERE password_salt IS NOT NULL'),
      db.prepare("INSERT OR IGNORE INTO app_config(key,value) VALUES('auth_legacy_v93','1')")
    ]);
  }
  return {integerUsers:columns.results.some(c=>c.name==='id'&&c.pk&&c.type.toUpperCase()==='INTEGER'),legacyNames,sessionKey:sessionNames.has('token_hash')?'token_hash':'id'};
}

export async function database(env) {

  if (!env.DB) throw Object.assign(new Error('O banco de contas não está conectado ao site. Tente novamente mais tarde.'), {status:503});

  if (!ready.has(env.DB)) {

    const task = (async()=>{

      await env.DB.batch(schema.map(sql=>env.DB.prepare(sql)));
      const layout=await authLayout(env.DB);

      await env.DB.batch([

        env.DB.prepare("INSERT OR IGNORE INTO anime_library SELECT * FROM anime_collections WHERE NOT EXISTS(SELECT 1 FROM app_config WHERE key='library_v9')"),

        env.DB.prepare("INSERT OR IGNORE INTO app_config VALUES('library_v9','1')")

      ]);

      // Existing deployments keep their server secret. New deployments initialize

      // a random installation key once, with an atomic insert, without a setup form.

      const generated=[...crypto.getRandomValues(new Uint8Array(32))].map(x=>x.toString(16).padStart(2,'0')).join('');

      await env.DB.prepare("INSERT OR IGNORE INTO app_config(key,value) VALUES('installation_key',?)").bind(env.AUTH_SECRET || generated).run();

      const row=await env.DB.prepare("SELECT value FROM app_config WHERE key='installation_key'").first();

      const secret=env.AUTH_SECRET || row.value;

      if(secret.length<32)throw Object.assign(new Error('A configuração de acesso precisa ser atualizada pelo administrador.'),{status:503});

      return {...env,AUTH_SECRET:secret,AUTH_LAYOUT:layout};

    })();

    ready.set(env.DB,task);task.catch(()=>ready.delete(env.DB));

  }

  return ready.get(env.DB);

}

export const schema = [
 `CREATE TABLE IF NOT EXISTS profile_media(user_id TEXT PRIMARY KEY,mime TEXT NOT NULL,data TEXT NOT NULL,x REAL NOT NULL DEFAULT 50,y REAL NOT NULL DEFAULT 50,zoom REAL NOT NULL DEFAULT 100)`,

 `CREATE TABLE IF NOT EXISTS user_appearance(user_id TEXT PRIMARY KEY,name_color TEXT NOT NULL DEFAULT 'ice' CHECK(name_color IN ('ice','blue','cyan','green','gold','orange','pink','violet')))`,

 `CREATE TABLE IF NOT EXISTS profile_privacy(user_id TEXT PRIMARY KEY,visibility TEXT NOT NULL DEFAULT 'private' CHECK(visibility IN ('private','public')))`,

 `CREATE TABLE IF NOT EXISTS playback_activity(user_id TEXT NOT NULL,anime_id INTEGER NOT NULL,season INTEGER NOT NULL,episode INTEGER NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(user_id,anime_id))`,



 `CREATE TABLE IF NOT EXISTS anime_library(user_id TEXT NOT NULL,anime_id INTEGER NOT NULL,kind TEXT NOT NULL CHECK(kind IN ('favorite','watchlater','watching','completed','paused','dropped')),created_at TEXT NOT NULL,PRIMARY KEY(user_id,anime_id,kind))`,

 `CREATE UNIQUE INDEX IF NOT EXISTS library_status_unique ON anime_library(user_id,anime_id) WHERE kind IN ('watching','completed','paused','dropped')`,

 `CREATE TABLE IF NOT EXISTS comment_reactions(user_id TEXT NOT NULL,comment_id TEXT NOT NULL,value INTEGER NOT NULL CHECK(value IN (-1,1)),PRIMARY KEY(user_id,comment_id))`,

 `CREATE INDEX IF NOT EXISTS comment_votes_by_comment ON comment_reactions(comment_id,value)`,

 `CREATE TABLE IF NOT EXISTS comment_keys(user_id TEXT NOT NULL,anime_id INTEGER NOT NULL,fingerprint TEXT NOT NULL,comment_id TEXT NOT NULL UNIQUE,PRIMARY KEY(user_id,anime_id,fingerprint))`,

 `CREATE TABLE IF NOT EXISTS episode_progress(user_id TEXT NOT NULL,anime_id INTEGER NOT NULL,season INTEGER NOT NULL,episode INTEGER NOT NULL,watched INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL,PRIMARY KEY(user_id,anime_id,season,episode))`,

 `CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, password_salt TEXT NOT NULL, avatar_url TEXT, bio TEXT DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,

 `CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,expires_at TEXT NOT NULL,created_at TEXT NOT NULL)`,

 `CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id)`,

 `CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions(expires_at)`,

 `CREATE TABLE IF NOT EXISTS auth_limits(id TEXT PRIMARY KEY,attempts INTEGER NOT NULL DEFAULT 0,expires_at INTEGER NOT NULL)`,

 `CREATE INDEX IF NOT EXISTS auth_limits_expires_idx ON auth_limits(expires_at)`,

 `CREATE TABLE IF NOT EXISTS app_config(key TEXT PRIMARY KEY,value TEXT NOT NULL)`,

 `CREATE TABLE IF NOT EXISTS anime_collections(user_id TEXT NOT NULL,anime_id INTEGER NOT NULL,kind TEXT NOT NULL CHECK(kind IN ('favorite','watchlater')),created_at TEXT NOT NULL,PRIMARY KEY(user_id,anime_id,kind))`,

 `CREATE TABLE IF NOT EXISTS anime_reactions(user_id TEXT NOT NULL,anime_id INTEGER NOT NULL,value INTEGER NOT NULL CHECK(value IN (-1,1)),updated_at TEXT NOT NULL,PRIMARY KEY(user_id,anime_id))`,

 `CREATE TABLE IF NOT EXISTS anime_comments(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,anime_id INTEGER NOT NULL,season INTEGER,episode INTEGER,parent_id TEXT,body TEXT NOT NULL,spoiler INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,

 `CREATE INDEX IF NOT EXISTS anime_comments_order ON anime_comments(anime_id,created_at DESC,id DESC)`,

 `CREATE TABLE IF NOT EXISTS comment_reports(user_id TEXT NOT NULL,comment_id TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(user_id,comment_id))`

];

