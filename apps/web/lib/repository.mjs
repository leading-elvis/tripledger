// SQL is intentionally identical on Sites D1 and self-hosted SQLite.
export function repository(sql) {
  return {
    async account(subject) {
      await sql.run('INSERT INTO accounts (id, subject) VALUES (?, ?) ON CONFLICT(subject) DO NOTHING',[crypto.randomUUID(),subject]);
      return (await sql.get('SELECT id FROM accounts WHERE subject = ?',[subject])).id;
    },
    async list(owner) {return (await sql.all('SELECT document, revision FROM ledgers WHERE owner = ? ORDER BY rowid DESC',[owner])).map(row=>({...JSON.parse(row.document),revision:row.revision}));},
    async get(id,owner) {const row=await sql.get('SELECT document, revision FROM ledgers WHERE id = ? AND owner = ?',[id,owner]);return row?{...JSON.parse(row.document),revision:row.revision}:null;},
    async insert(trip,owner) {return sql.run('INSERT INTO ledgers (id, owner, revision, document) SELECT ?, ?, 1, ? WHERE (SELECT COUNT(*) FROM ledgers WHERE owner = ?) < 50 ON CONFLICT(id) DO NOTHING',[trip.id,owner,JSON.stringify(trip),owner]);},
    async update(trip,owner,revision) {return sql.run('UPDATE ledgers SET document = ?, revision = revision + 1 WHERE id = ? AND owner = ? AND revision = ?',[JSON.stringify(trip),trip.id,owner,revision]);},
  };
}
