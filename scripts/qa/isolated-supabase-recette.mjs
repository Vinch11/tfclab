/**
 * P0 storage / RLS probe. SYNTHETIC accounts and a SEPARATE Supabase project only.
 * Read docs/qa/DET_ENGINE_P0_OPERATIONAL_GATE_2026-11-01.md before running.
 * Not a sports, UI, PDF, deployment or production certification.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function env(k) {
  const v = process.env[k]?.trim();
  if (!v) throw new Error('Missing environment variable ' + k);
  return v;
}
const url = env('TFCL_RECETTE_SUPABASE_URL');
assert.equal(new URL(url).origin, new URL(env('TFCL_RECETTE_APPROVED_URL')).origin, 'Project not separately approved');
assert.notEqual(new URL(url).origin, new URL(env('TFCL_PRODUCTION_SUPABASE_URL')).origin, 'Refusing production URL');
assert.equal(env('TFCL_RECETTE_WRITE_ACK'), 'I_AUTHORIZE_SYNTHETIC_ISOLATED_WRITES');
assert.ok(new URL(url).hostname.endsWith('.supabase.co') || ['localhost', '127.0.0.1'].includes(new URL(url).hostname));
const key = env('TFCL_RECETTE_ANON_KEY');
const mode = process.env.TFCL_RECETTE_AUTH_MODE?.trim() || 'password';
assert.ok(mode === 'password' || mode === 'token-file',
  'Unsupported synthetic Auth mode');
const ca = { email: env('TFCL_RECETTE_COACH_A_EMAIL') };
const cb = { email: env('TFCL_RECETTE_COACH_B_EMAIL') };
if (mode === 'password') {
  ca.password = env('TFCL_RECETTE_COACH_A_PASSWORD');
  cb.password = env('TFCL_RECETTE_COACH_B_PASSWORD');
} else {
  ca.tokenFile = env('TFCL_RECETTE_COACH_A_TOKEN_FILE');
  cb.tokenFile = env('TFCL_RECETTE_COACH_B_TOKEN_FILE');
  assert.notEqual(ca.tokenFile, cb.tokenFile, 'Identical token files forbidden');
}
assert.notEqual(ca.email.toLowerCase(), cb.email.toLowerCase());
const marker = 'TFCL_RECETTE_' + randomUUID();
// Reserve synthetic IDs BEFORE writes. If an INSERT reaches the database but
// its response is lost, the cleanup still knows exactly which rows to target.
const ids = {
  athleteA: randomUUID(), athleteB: randomUUID(), test: randomUUID(),
  snapshot: randomUUID(), snapshotB: randomUUID(),
  v1: randomUUID(), v2: randomUUID(),
};
const errorsOnCleanup = [];
let a, b, fresh, checks = 0, failure = null;

const authOptions = {
  persistSession: false, autoRefreshToken: false, detectSessionInUrl: false,
};
const makeClient = (accessToken) => createClient(url, key, {
  auth: authOptions,
  // A separately approved user-scoped access token, NOT a service_role key.
  ...(accessToken ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } } : {}),
});
function readSyntheticToken(path) {
  // Token file must be created by the approved QA identity workflow,
  // preferably under a protected temp directory and NEVER checked into Git.
  const info = statSync(path);
  assert.ok(info.isFile(), 'Synthetic token source must be a regular file');
  if (process.platform !== 'win32') {
    assert.equal(info.mode & 0o077, 0, 'Token file is readable by other users');
  }
  const parsed = JSON.parse(readFileSync(path, 'utf8'));
  const token = parsed.access_token ?? parsed.session?.access_token ?? parsed.token;
  assert.ok(typeof token === 'string' && token.length > 20,
    'Token file must contain a user access_token');
  return token;
}
async function login(credentials) {
  if (mode === 'token-file') {
    const accessToken = readSyntheticToken(credentials.tokenFile);
    const db = makeClient(accessToken);
    // Ask Auth itself for the user. Do not rely on unverified JWT claims.
    const { data, error } = await db.auth.getUser(accessToken);
    if (error || !data?.user?.id) {
      throw new Error('Synthetic token rejected by Auth');
    }
    assert.equal(data.user.email?.toLowerCase(), credentials.email.toLowerCase(),
      'Token identity does not match expected synthetic email');
    return { db, uid: data.user.id };
  }
  const db = makeClient();
  const { data, error } = await db.auth.signInWithPassword(credentials);
  if (error || !data?.user?.id) throw new Error('Synthetic login failed: ' + (error?.message || 'missing identity'));
  assert.equal(data.user.email?.toLowerCase(), credentials.email.toLowerCase(),
    'Wrong synthetic login identity');
  return { db, uid: data.user.id };
}
function checked(res, label) {
  if (res.error) throw new Error(label + ': ' + (res.error.code || 'DB_ERROR') + ' ' + res.error.message);
  assert.ok(res.data, label + ': no returned data');
  return res.data;
}
async function get(db, table, id, column = 'id') {
  const res = await db.from(table).select('*').eq(column, id).maybeSingle();
  return checked({ data: res.error ? undefined : res.data ?? false, error: res.error }, 'read ' + table) || null;
}
async function getOptional(db, table, id, column = 'id') {
  const res = await db.from(table).select('*').eq(column, id).maybeSingle();
  if (res.error) throw new Error('read ' + table + ': ' + res.error.message);
  return res.data;
}
async function hide(db, table, id, column = 'id') {
  assert.equal(await getOptional(db, table, id, column), null, 'RLS leak in ' + table);
  checks++;
}
async function denyWrite(db, table, id, column, update) {
  const res = await db.from(table).update(update).eq(column, id).select(column);
  assert.ok(res.error || (res.data?.length || 0) === 0, 'RLS foreign update in ' + table);
  checks++;
}
async function denyCrossCoachInsert(db, table, payload) {
  const attemptId = randomUUID();
  try {
    // Error is mandatory. An HTTP success without returned rows is NOT proof
    // that the foreign-athlete row was rejected.
    const res = await db.from(table).insert({ id: attemptId, ...payload }).select('id');
    assert.ok(res.error, 'Cross-coach INSERT accepted in ' + table);
    // Inspect the attempted ID before cleanup. A response error by itself
    // cannot certify that the write was rolled back.
    assert.equal(await getOptional(db, table, attemptId), null,
      'Cross-coach INSERT persisted despite error in ' + table);
    checks++;
  } finally {
    // This row is synthetic and belongs solely to the attempt. Clean even
    // when a misconfigured RLS policy unexpectedly permitted the insertion.
    await cleanup(db, table, 'id', attemptId);
  }
}
async function cleanup(db, table, column, id) {
  if (!db || !id) return;
  const res = await db.from(table).delete().eq(column, id);
  if (res.error) errorsOnCleanup.push('delete ' + table + ': ' + (res.error.code || 'DB_ERROR'));
  else {
    try { if (await getOptional(db, table, id, column)) errorsOnCleanup.push('row remains in ' + table); }
    catch (e) { errorsOnCleanup.push('check deletion ' + table + ': ' + e.message); }
  }
}
function plan(revision) {
  return {
    title: marker, _recipeId: marker, _revision: revision, _planStartDate: '2026-11-02',
    _objective: 'STORAGE_ONLY', _coachLimiterOrder: ['aerobic_ceiling', 'fractional_utilization'],
    _markdown: '# Synthetic storage test ' + revision,
    weeks: [{ number: 1, phase: 'base', sessions: [{
      day: 1, dayIndex: 0, dayName: 'Lundi', title: 'Synthetic easy endurance',
      details: 'Not an athlete prescription', durationMin: revision === 1 ? 40 : 45,
      zone: 'Z2', catalogId: null, custom: true, isRest: false,
    }] }],
  };
}
try {
  a = await login(ca);
  b = await login(cb);
  assert.notEqual(a.uid, b.uid); checks++;

  ids.athleteA = checked(await a.db.from('athletes')
    .insert({ id: ids.athleteA, coach_id: a.uid, name: marker + '_A', goal: '70.3', refs: { recipe: marker } })
    .select('id').single(), 'create athlete A').id;
  ids.athleteB = checked(await b.db.from('athletes')
    .insert({ id: ids.athleteB, coach_id: b.uid, name: marker + '_B', goal: '70.3', refs: { recipe: marker } })
    .select('id').single(), 'create athlete B').id;
  ids.test = checked(await a.db.from('tests')
    .insert({ id: ids.test, athlete_id: ids.athleteA, coach_id: a.uid, name: marker, type: 'field',
      sport: 'course', raw: { recipe: marker }, reliability: 0.8 })
    .select('id').single(), 'create test').id;
  ids.snapshot = checked(await a.db.from('snapshots')
    .insert({ id: ids.snapshot, athlete_id: ids.athleteA, coach_id: a.uid, source: 'manual',
      sport_main: 'run', vma: 15.2, field_sources: { recipe: marker } })
    .select('id').single(), 'create profile').id;
  checked(await a.db.from('athletes').update({ active_snapshot_id: ids.snapshot })
    .eq('id', ids.athleteA).select('id').single(), 'activate profile');
  ids.snapshotB = checked(await b.db.from('snapshots')
    .insert({ id: ids.snapshotB, athlete_id: ids.athleteB, coach_id: b.uid,
      source: 'manual', sport_main: 'run', field_sources: { recipe: marker } })
    .select('id').single(), 'create B profile').id;

  const p1 = plan(1), p2 = plan(2);
  ids.v1 = checked(await a.db.from('plan_versions')
    .insert({ id: ids.v1, athlete_id: ids.athleteA, coach_id: a.uid, plan_json: p1,
      objective: 'STORAGE_ONLY', weeks_count: 1, sessions_count: 1 })
    .select('id').single(), 'archive v1').id;
  checked(await a.db.from('plans')
    .upsert({ athlete_id: ids.athleteA, coach_id: a.uid, plan_json: p1 },
      { onConflict: 'athlete_id' }).select('athlete_id').single(), 'generic plan v1');

  // New authenticated client, not the original React state or a mock transport.
  fresh = await login(ca);
  assert.equal(fresh.uid, a.uid);
  assert.deepEqual((await get(fresh.db, 'plan_versions', ids.v1)).plan_json, p1);
  assert.deepEqual((await get(fresh.db, 'plans', ids.athleteA, 'athlete_id')).plan_json, p1);
  assert.equal((await get(fresh.db, 'athletes', ids.athleteA)).active_snapshot_id, ids.snapshot);
  assert.equal((await get(fresh.db, 'tests', ids.test)).raw.recipe, marker);
  checks += 4;

  ids.v2 = checked(await fresh.db.from('plan_versions')
    .insert({ id: ids.v2, athlete_id: ids.athleteA, coach_id: a.uid, plan_json: p2,
      objective: 'STORAGE_ONLY', weeks_count: 1, sessions_count: 1 })
    .select('id').single(), 'archive v2').id;
  checked(await fresh.db.from('plans')
    .upsert({ athlete_id: ids.athleteA, coach_id: a.uid, plan_json: p2 },
      { onConflict: 'athlete_id' }).select('athlete_id').single(), 'generic plan v2');
  assert.deepEqual((await get(fresh.db, 'plan_versions', ids.v1)).plan_json, p1);
  assert.deepEqual((await get(fresh.db, 'plan_versions', ids.v2)).plan_json, p2);
  assert.deepEqual((await get(fresh.db, 'plans', ids.athleteA, 'athlete_id')).plan_json, p2);
  checks += 3;

  await hide(b.db, 'athletes', ids.athleteA);
  await hide(b.db, 'tests', ids.test);
  await hide(b.db, 'snapshots', ids.snapshot);
  await hide(b.db, 'plan_versions', ids.v1);
  await hide(b.db, 'plan_versions', ids.v2);
  await hide(b.db, 'plans', ids.athleteA, 'athlete_id');
  // A coach must not be able to point their athlete at the other coach's
  // physiological snapshot. The bare FK is not an ownership check.
  const foreignSnapshot = await a.db.from('athletes')
    .update({ active_snapshot_id: ids.snapshotB })
    .eq('id', ids.athleteA).select('id');
  assert.ok(foreignSnapshot.error || (foreignSnapshot.data?.length || 0) === 0,
    'Cross-coach active snapshot UPDATE accepted');
  assert.equal((await get(a.db, 'athletes', ids.athleteA)).active_snapshot_id,
    ids.snapshot, 'Cross-coach snapshot replaced A active profile');
  checks++;

  await denyWrite(b.db, 'athletes', ids.athleteA, 'id', { goal: 'RLS_ATTACK' });
  await denyWrite(b.db, 'plan_versions', ids.v1, 'id', { objective: 'RLS_ATTACK' });
  await denyWrite(b.db, 'plans', ids.athleteA, 'athlete_id', { plan_json: { intruder: marker } });
  await denyCrossCoachInsert(b.db, 'plan_versions', {
    athlete_id: ids.athleteA, coach_id: b.uid, plan_json: { _recipeId: marker }
  });
  // A competing upsert must never overwrite coach A's existing plan.
  const foreignPlanUpsert = await b.db.from('plans')
    .upsert({ athlete_id: ids.athleteA, coach_id: b.uid,
      plan_json: { intruder: marker } }, { onConflict: 'athlete_id' })
    .select('athlete_id');
  assert.ok(foreignPlanUpsert.error || (foreignPlanUpsert.data?.length || 0) === 0,
    'Cross-coach plan UPSERT accepted');
  assert.deepEqual((await get(fresh.db, 'plans', ids.athleteA, 'athlete_id')).plan_json, p2,
    'Cross-coach upsert modified coach A plan');
  checks++;

  await denyCrossCoachInsert(b.db, 'tests', {
    athlete_id: ids.athleteA, coach_id: b.uid,
    name: marker + '_foreign', type: 'field', raw: { recipe: marker }
  });
  await denyCrossCoachInsert(b.db, 'snapshots', {
    athlete_id: ids.athleteA, coach_id: b.uid,
    source: 'manual', sport_main: 'run', field_sources: { recipe: marker }
  });
  assert.equal((await get(fresh.db, 'athletes', ids.athleteA)).goal, '70.3');
  assert.deepEqual((await get(fresh.db, 'plan_versions', ids.v1)).plan_json, p1);
  assert.deepEqual((await get(fresh.db, 'plans', ids.athleteA, 'athlete_id')).plan_json, p2);
  checks += 3;

  // An invalid type is not a useful integrity proof: UUID parsing would
  // reject it before any ownership constraint runs. Use a valid, non-existent
  // athlete UUID and prove the server refuses to create an orphaned version.
  const orphanAttemptId = randomUUID();
  try {
    const invalid = await fresh.db.from('plan_versions')
      .insert({ id: orphanAttemptId, athlete_id: randomUUID(),
        coach_id: a.uid, plan_json: { _recipeId: marker } }).select('id');
    assert.ok(invalid.error, 'orphan plan version INSERT accepted');
    assert.equal(await getOptional(fresh.db, 'plan_versions', orphanAttemptId),
      null, 'orphan plan version survived a refusal');
    assert.deepEqual((await get(fresh.db, 'plan_versions', ids.v2)).plan_json, p2);
    checks++;
  } finally {
    await cleanup(fresh.db, 'plan_versions', 'id', orphanAttemptId);
  }
} catch (e) {
  failure = e?.message || String(e);
} finally {
  await cleanup(a?.db, 'plans', 'athlete_id', ids.athleteA);
  await cleanup(a?.db, 'plan_versions', 'id', ids.v2);
  await cleanup(a?.db, 'plan_versions', 'id', ids.v1);
  await cleanup(a?.db, 'tests', 'id', ids.test);
  if (ids.athleteA && ids.snapshot) {
    const r = await a.db.from('athletes').update({ active_snapshot_id: null }).eq('id', ids.athleteA);
    if (r.error) errorsOnCleanup.push('unset synthetic profile: ' + (r.error.code || 'DB_ERROR'));
  }
  await cleanup(a?.db, 'snapshots', 'id', ids.snapshot);
  await cleanup(a?.db, 'athletes', 'id', ids.athleteA);
  await cleanup(b?.db, 'snapshots', 'id', ids.snapshotB);
  await cleanup(b?.db, 'athletes', 'id', ids.athleteB);
  await fresh?.db.auth.signOut();
  await a?.db.auth.signOut();
  await b?.db.auth.signOut();
}
if (errorsOnCleanup.length) failure = [failure, ...errorsOnCleanup].filter(Boolean).join('; ');
console.log(JSON.stringify({ status: failure ? 'FAIL' : 'PASS', checks, marker,
  // Synthetic UUIDs are safe to report; use them for an independent SQL
  // residue check in the isolated project's SQL editor after this run.
  syntheticIds: ids, independentResidueAuditRequired: true,
  scope: 'isolated-storage-rls', uiPdfAttested: false, sportsAttested: false,
  productionAttested: false, ...(failure ? { reason: failure } : {}) }));
if (failure) process.exitCode = 1;
