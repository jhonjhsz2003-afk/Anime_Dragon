import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {schema} from '../server/database.js';

const reactionTable = 'CREATE TABLE anime_reactions(user_id TEXT NOT NULL,anime_id INTEGER NOT NULL,value INTEGER NOT NULL CHECK(value IN (-1,1)),updated_at TEXT NOT NULL,PRIMARY KEY(user_id,anime_id))';
const scoreQuery = 'SELECT COALESCE(SUM(value=1),0) likes,COALESCE(SUM(value=-1),0) dislikes FROM anime_reactions WHERE anime_id=?';

for (const [name,apply] of [
  ['arquivo SQL',db=>db.exec(readFileSync(new URL('../db/schema.sql',import.meta.url),'utf8'))],
  ['inicialização do aplicativo',db=>schema.forEach(sql=>db.exec(sql))]
]) {
  test(`${name}: índice por anime preserva reações existentes e pode ser reaplicado`,()=>{
    const db = new DatabaseSync(':memory:');
    try {
      db.exec(reactionTable);
      const insert = db.prepare('INSERT INTO anime_reactions VALUES(?,?,?,?)');
      insert.run('u1',10,1,'2026-10-04');
      insert.run('u2',10,-1,'2026-10-04');
      insert.run('u3',11,1,'2026-10-04');
      apply(db);
      apply(db);
      assert.equal(db.prepare('SELECT COUNT(*) total FROM anime_reactions').get().total,3);
      const score = db.prepare(scoreQuery).get(10);
      assert.equal(score.likes,1);
      assert.equal(score.dislikes,1);
      const indexes = db.prepare('PRAGMA index_list(anime_reactions)').all();
      assert.equal(indexes.filter(index=>index.name==='anime_reactions_by_anime').length,1);
      assert.match(db.prepare('EXPLAIN QUERY PLAN '+scoreQuery).get(10).detail,/USING INDEX anime_reactions_by_anime/);
    } finally {
      db.close();
    }
  });
}
