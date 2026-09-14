const ready = new WeakMap();
export async function database(env) {
  if (!env.DB) throw Object.assign(new Error('O banco de contas não está conectado ao site. Tente novamente mais tarde.'), {status:503});
  if (!ready.has(env.DB)) {
    const task = (async()=>{
      await env.DB.batch(schema.map(sql=>env.DB.prepare(sql)));
      // Existing deployments keep their server secret. New deployments initialize
      // a random installation key once, with an atomic insert, without a setup form.
      const generated=[...crypto.getRandomValues(new Uint8Array(32))].map(x=>x.toString(16).padStart(2,'0')).join('');
      await env.DB.prepare("INSERT OR IGNORE INTO app_config(key,value) VALUES('installation_key',?)").bind(env.AUTH_SECRET || generated).run();
      const row=await env.DB.prepare("SELECT value FROM app_config WHERE key='installation_key'").first();
      const secret=env.AUTH_SECRET || row.value;
      if(secret.length<32)throw Object.assign(new Error('A configuração de acesso precisa ser atualizada pelo administrador.'),{status:503});
      return {...env,AUTH_SECRET:secret};
    })();
    ready.set(env.DB,task);task.catch(()=>ready.delete(env.DB));
  }
  return ready.get(env.DB);
}
export const schema = [
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
