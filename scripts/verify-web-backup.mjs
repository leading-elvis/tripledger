// Restore an already-exported backup; this utility never contacts Sites.
// Usage (Node.js 24): node scripts/verify-web-backup.mjs <backup.json>
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { balances, LIMITS, validateTrip } from '../apps/web/lib/domain.mjs';
import { inspectBackup, sha256 } from '../apps/web/lib/backup.mjs';

const webRoot = fileURLToPath(new URL('../apps/web/', import.meta.url));
const shutdownMessage = 'tripledger-verification-shutdown';

async function freePort() {
  const probe = createServer();
  await new Promise((accept, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', accept); });
  const port = probe.address().port;
  await new Promise((accept, reject) => probe.close(error => error ? reject(error) : accept()));
  return port;
}

// Only receipt storage IDs may change on import; compare every other field.
function portableTrip(value) {
  const clean = validateTrip(value);
  for (const expense of clean.expenses) if (expense.receipt) delete expense.receipt.id;
  return clean;
}

async function main() {
  assert.equal(Number(process.versions.node.split('.')[0]), 24, 'Run this verification with Node.js 24.');
  assert.equal(process.argv.length, 3, 'Usage: node scripts/verify-web-backup.mjs <backup.json>');
  const sourcePath = resolve(process.argv[2]);
  assert.ok(statSync(sourcePath).size <= LIMITS.bodyBytes, 'Backup exceeds the supported 14 MiB limit.');
  const raw = readFileSync(sourcePath);
  const backup = JSON.parse(raw.toString('utf8').replace(/^\uFEFF/, ''));
  const { trip: original, files } = await inspectBackup(backup);
  if (backup.schemaVersion >= 3) {
    const expected=structuredClone(backup.trip);
    if(backup.schemaVersion===3)for(const fields of [...expected.expenses,...expected.history.filter(h=>['edit-expense','void-expense'].includes(h.action)).flatMap(h=>[h.before,h.after])]){
      if(fields.payments===undefined){fields.payments=[{memberId:fields.payerId,amount:fields.amount}];delete fields.payerId;}
    }
    assert.deepEqual(JSON.parse(JSON.stringify(original)), expected, 'Backup validation must preserve every field except the explicit legacy payer upgrade.');
  }
  if(backup.schemaVersion<4)for(const expense of backup.trip.expenses.filter(e=>e.payerId))assert.deepEqual(original.expenses.find(e=>e.id===expense.id).payments,[{memberId:expense.payerId,amount:expense.amount}]);
  assert.ok(existsSync(join(webRoot, 'dist-standalone', 'index.html')), 'Build apps/web/standalone/vite.config.ts before running.');

  const outputRoot = join(webRoot, '.test-output');
  mkdirSync(outputRoot, { recursive: true });
  const runDir = mkdtempSync(join(outputRoot, 'cloud-restore-'));
  const reportPath = join(runDir, 'report.json');
  const port = await freePort(), origin = `http://127.0.0.1:${port}`;
  const password = randomBytes(32).toString('hex');
  const cancel = new AbortController();
  const onInterrupt = () => cancel.abort(new Error('Verification interrupted.'));
  process.once('SIGINT', onInterrupt);
  process.once('SIGTERM', onInterrupt);
  let server, failure, stage = 'start';
  const report = {
    passed: false, startedAt: new Date().toISOString(), nodeVersion: process.version,
    source: { path: sourcePath, sha256: await sha256(raw), schemaVersion: backup.schemaVersion, revision: backup.sourceRevision ?? null },
    destination: { platform: process.platform, runtime: 'Independent Node.js + SQLite + local receipt files', dataDirectory: join(runDir, 'data'), origin },
    tripId: original.id, currency: original.currency,
    counts: { members: original.members.length, expenses: original.expenses.length, multiPayerExpenses: original.expenses.filter(e=>e.payments.length>1).length, paymentEntries: original.expenses.reduce((n,e)=>n+e.payments.length,0), repayments: original.repayments.length, history: original.history.length, actors: original.team.actors.length, membershipEvents: original.team.events.length, pendingRepayments: original.repayments.filter(r=>r.status==='pending').length, receipts: files.length },
    checks: {},
  };

  async function start() {
    cancel.signal.throwIfAborted();
    // IPC invokes the existing server shutdown handler on Windows too.
    const wrapper = `process.on('message', message => { if (message === ${JSON.stringify(shutdownMessage)}) process.emit('SIGTERM'); }); await import(${JSON.stringify(pathToFileURL(join(webRoot, 'standalone', 'server.mjs')).href)});`;
    const child = server = spawn(process.execPath, ['--input-type=module', '--eval', wrapper], {
      cwd: webRoot, windowsHide: true,
      env: { ...process.env, TRIPLEDGER_PASSWORD: password, HOST: '127.0.0.1', PORT: String(port), PUBLIC_ORIGIN: origin, DATA_DIR: join(runDir, 'data') },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
    let output = '', errors = '';
    child.stderr.on('data', chunk => { errors = (errors + chunk.toString()).slice(-8192); });
    await new Promise((accept, reject) => {
      const finish = error => {
        clearTimeout(timer); child.off('error', onError); child.off('exit', onExit); child.stdout.off('data', onData); cancel.signal.removeEventListener('abort', onAbort);
        error ? reject(error) : accept();
      };
      const onError = error => finish(error);
      const onExit = code => finish(new Error(`Standalone exited during startup (${code}): ${errors}`));
      const onAbort = () => finish(cancel.signal.reason);
      const onData = chunk => {
        output = (output + chunk.toString()).slice(-8192);
        if (output.includes(`TripLedger independent server: ${origin}`)) finish();
      };
      const timer = setTimeout(() => finish(new Error(`Standalone startup timed out: ${errors}`)), 15000);
      child.once('error', onError); child.once('exit', onExit); child.stdout.on('data', onData); cancel.signal.addEventListener('abort', onAbort, { once: true });
      if (cancel.signal.aborted) onAbort();
    });
  }

  async function stop() {
    const child = server; server = undefined;
    if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return;
    let timer;
    const exited = new Promise(accept => child.once('exit', (code, signal) => accept({ code, signal })));
    const timeout = ms => new Promise(accept => { timer = setTimeout(() => accept(null), ms); });
    if (child.connected) child.send(shutdownMessage, () => {});
    const result = await Promise.race([exited, timeout(5000)]);
    clearTimeout(timer);
    if (result) { assert.equal(result.code, 0, 'Standalone did not shut down cleanly.'); return; }
    child.kill('SIGKILL');
    await Promise.race([exited, timeout(5000)]); clearTimeout(timer);
    throw new Error('Standalone required forced shutdown; graceful restart verification failed.');
  }

  async function request(path, data, cookie = '') {
    return fetch(`${origin}/api/${path}`, {
      method: data === undefined ? 'GET' : 'POST', redirect: 'error',
      signal: AbortSignal.any([cancel.signal, AbortSignal.timeout(15000)]),
      headers: { cookie, origin, 'content-type': 'application/json', connection: 'close' },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    });
  }
  async function json(path, data, cookie = '', status = 200) {
    const response = await request(path, data, cookie);
    const value = await response.json();
    assert.equal(response.status, status, `${path}: expected HTTP ${status}, got ${response.status}`);
    return value;
  }
  async function login() {
    const response = await request('login', { password });
    assert.equal(response.status, 200, 'Standalone login failed.');
    const cookie = response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
    await response.arrayBuffer();
    assert.ok(cookie, 'Standalone did not issue a session cookie.');
    return cookie;
  }
  async function verifyReceipts(restored, cookie) {
    const receipts = [];
    for (const expense of original.expenses.filter(value => value.receipt)) {
      const actual = restored.expenses.find(value => value.id === expense.id).receipt;
      const source = files.find(value => value.meta.id === expense.receipt.id);
      assert.notEqual(actual.id, expense.receipt.id, 'Receipt storage ID should be remapped.');
      const response = await request(`trips/${original.id}/receipts/${actual.id}`, undefined, cookie);
      assert.equal(response.status, 200, 'Restored receipt was unavailable.');
      assert.equal(response.headers.get('content-type'), source.meta.mime);
      const bytes = new Uint8Array(await response.arrayBuffer());
      assert.equal(bytes.length, source.meta.size);
      const hash = await sha256(bytes);
      assert.equal(hash, source.meta.sha256, 'Restored receipt checksum changed.');
      assert.deepEqual(bytes, source.bytes, 'Restored receipt bytes changed.');
      receipts.push({ expenseId: expense.id, sourceId: source.meta.id, restoredId: actual.id, size: bytes.length, sha256: hash });
    }
    return receipts;
  }

  try {
    await start();
    stage = 'unauthorized access';
    await json('state', undefined, '', 401); report.checks.unauthorizedRejected = true;
    let cookie = await login();
    assert.equal((await json('state', undefined, cookie)).trips.length, 0, 'Destination must be empty.');
    stage = 'import and financial comparison';
    const { trip: restored } = await json('import', backup, cookie, 201);
    assert.deepEqual(portableTrip(restored), portableTrip(original), 'Imported financial data, IDs or metadata changed.');
    assert.deepEqual(balances(restored), balances(original));
    assert.equal(restored.me.isOwner, true);
    assert.equal(restored.me.role, 'admin');
    assert.equal(restored.me.actorId, null, 'Importer must not impersonate a historical actor.');
    assert.ok(restored.teamMembers.every(person => !person.connected), 'Imported actors must not inherit account bindings.');
    assert.deepEqual(restored.invitations, []);
    assert.deepEqual(restored.joinRequests, []);
    report.checks.liveAuthorityReset = true;
    assert.equal(Object.values(balances(restored)).reduce((sum, value) => sum + value, 0), 0);
    report.checks.financialDataAndMemberIdsPreserved = true;
    report.balances = balances(restored);
    stage = 'all receipt bytes';
    report.receipts = await verifyReceipts(restored, cookie);
    await json(`trips/${original.id}/backup`, undefined, '', 401);
    if (report.receipts.length) await json(`trips/${original.id}/receipts/${report.receipts[0].restoredId}`, undefined, '', 401);
    report.checks.receiptsVerified = true;
    stage = 'duplicate import';
    await json('import', backup, cookie, 409); report.checks.duplicateImportRejected = true;
    assert.deepEqual((await json('state', undefined, cookie)).trips, [restored]);
    stage = 'graceful restart and persistence';
    await stop(); await start();
    await json('state', undefined, cookie, 401);
    cookie = await login();
    const state = await json('state', undefined, cookie);
    assert.deepEqual(state.trips, [restored], 'Persisted trip changed after process restart.');
    assert.deepEqual(await verifyReceipts(state.trips[0], cookie), report.receipts);
    report.checks.restartPersistenceVerified = true;
    stage = 'restored full backup';
    const rawReexported=await json(`trips/${original.id}/backup`,undefined,cookie);
    assert.equal(rawReexported.schemaVersion,5);
    const reexported = await inspectBackup(rawReexported);
    assert.deepEqual(JSON.parse(JSON.stringify(reexported.trip)),rawReexported.trip);
    assert.deepEqual(portableTrip(reexported.trip), portableTrip(original));
    assert.equal(reexported.files.length, files.length);
    report.checks.restoredBackupValidated = true;
    report.passed = true;
  } catch (error) {
    failure = error; report.failedStage = stage; report.error = error.message;
  } finally {
    try { await stop(); } catch (error) { failure ??= error; report.passed = false; report.shutdownError = error.message; }
    process.removeListener('SIGINT', onInterrupt); process.removeListener('SIGTERM', onInterrupt);
    report.finishedAt = new Date().toISOString();
    writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify({ passed: report.passed, tripId: original.id, counts: report.counts, reportPath }, null, 2));
  }
  if (failure) throw failure;
}

main().catch(error => { console.error(`Backup verification failed: ${error.message}`); process.exitCode = 1; });
