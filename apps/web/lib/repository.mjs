// SQL is intentionally identical on Sites D1 and self-hosted SQLite.
export function repository(sql) {
  const readable="(owner = ? OR EXISTS (SELECT 1 FROM json_each(access, '$.bindings') b WHERE json_extract(b.value, '$.accountId') = ?))";
  const unpack=row=>row?{...JSON.parse(row.document),revision:row.revision,_owner:row.owner,_access:JSON.parse(row.access)}:null;
  return {
    async account(subject) {
      await sql.run('INSERT INTO accounts (id, subject) VALUES (?, ?) ON CONFLICT(subject) DO NOTHING',[crypto.randomUUID(),subject]);
      return (await sql.get('SELECT id FROM accounts WHERE subject = ?',[subject])).id;
    },
    async list(account) {return (await sql.all(`SELECT document, revision, owner, access FROM ledgers WHERE ${readable} ORDER BY rowid DESC`,[account,account])).map(unpack);},
    async get(id,account) {return unpack(await sql.get(`SELECT document, revision, owner, access FROM ledgers WHERE id = ? AND ${readable}`,[id,account,account]));},
    // Only the token endpoint may call this; it verifies the secret before returning any trip data.
    async forInvitation(id) {return unpack(await sql.get('SELECT document, revision, owner, access FROM ledgers WHERE id = ?',[id]));},
    async requests(account) {return (await sql.all("SELECT id, document, access FROM ledgers WHERE EXISTS (SELECT 1 FROM json_each(access, '$.requests') r WHERE json_extract(r.value, '$.accountId') = ?)",[account])).flatMap(row=>JSON.parse(row.access).requests.filter(r=>r.accountId===account).map(r=>({id:r.id,tripId:row.id,tripName:JSON.parse(row.document).name,status:r.status})));},
    async insert(trip,owner,access={}) {return sql.run('INSERT INTO ledgers (id, owner, revision, document, access) SELECT ?, ?, 1, ?, ? WHERE (SELECT COUNT(*) FROM ledgers WHERE owner = ?) < 50 ON CONFLICT(id) DO NOTHING',[trip.id,owner,JSON.stringify(trip),JSON.stringify(access),owner]);},
    // Every ACL change and financial write shares this one CAS. No separate permission-write race.
    async update(trip,owner,revision,access) {const clean={...trip};delete clean._owner;delete clean._access;delete clean.revision;return sql.run('UPDATE ledgers SET document = ?, access = COALESCE(?, access), revision = revision + 1 WHERE id = ? AND owner = ? AND revision = ?',[JSON.stringify(clean),access===undefined?null:JSON.stringify(access),trip.id,owner,revision]);},
  };
}
