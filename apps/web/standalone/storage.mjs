import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { repository } from '../lib/repository.mjs';

export function openStorage(directory) {
  const root=resolve(directory);mkdirSync(join(root,'receipts'),{recursive:true});
  const db=new DatabaseSync(join(root,'tripledger.sqlite'));
  db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS app_migrations (name TEXT PRIMARY KEY);');
  const migrations=fileURLToPath(new URL('../drizzle/',import.meta.url));
  for(const name of readdirSync(migrations).filter(name=>name.endsWith('.sql')).sort())if(!db.prepare('SELECT 1 FROM app_migrations WHERE name = ?').get(name)) {
    db.exec('BEGIN IMMEDIATE');try{db.exec(readFileSync(join(migrations,name),'utf8'));db.prepare('INSERT INTO app_migrations (name) VALUES (?)').run(name);db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}
  }
  const repo=repository({get:async(sql,v)=>db.prepare(sql).get(...v),all:async(sql,v)=>db.prepare(sql).all(...v),run:async(sql,v)=>Number(db.prepare(sql).run(...v).changes)});
  const objectPath=key=>{if(!/^[a-f0-9-]{36}\/[a-f0-9-]{36}$/i.test(key))throw new Error('Invalid object key');return join(root,'receipts',key.replace('/','_'));};
  const objects={get:async key=>existsSync(objectPath(key))?new Uint8Array(readFileSync(objectPath(key))):null,put:async(key,bytes)=>{writeFileSync(objectPath(key),bytes,{flag:'wx'});},delete:async key=>{if(existsSync(objectPath(key)))unlinkSync(objectPath(key));}};
  return {repo,objects,close:()=>db.close()};
}
