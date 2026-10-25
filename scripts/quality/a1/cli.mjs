import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { evaluateCase, DEFAULT_A1 } from './adapter.mjs';
import { prepareCase, caseIds } from './cases.mjs';
// No startup side effect: evaluation is an explicit separate command, disabled by default.
const [command, id, configPath, stateDir, missionId] = process.argv.slice(2);
try {
  if (command === 'list') console.log(JSON.stringify(caseIds));
  else if (command === 'prepare') {
    const bundle = prepareCase(id);
    // Do not print the full bundle unless an output file is explicitly requested.
    if (configPath) writeFileSync(configPath, JSON.stringify(bundle, null, 2), { mode: 0o600, flag: 'wx' });
    console.log(JSON.stringify({ state: 'prepared', caseId: id, bundleHash: bundle.bundleHash,
      evidenceCount: bundle.evidence.length, inputBytes: Buffer.byteLength(JSON.stringify(bundle)), applicableCriteria: bundle.applicableCriteria }));
  } else if (command === 'evaluate') {
    const dirty = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim();
    if (dirty) throw new Error('dirty_worktree');
    const config = configPath ? JSON.parse(readFileSync(configPath, 'utf8')) : DEFAULT_A1;
    const result = await evaluateCase({ caseId: id, missionId, stateDir, config, apiKey: process.env.OPENAI_API_KEY });
    console.log(JSON.stringify({ sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), ...result }));
    if (result.state === 'stopped') process.exitCode = 2;
  } else { console.log('Usage: cli.mjs list | prepare <caseId> [new-output.json] | evaluate <caseId> [config.json stateDir missionId]'); process.exitCode = 2; }
} catch (error) {
  const code = ['case_not_approved', 'dirty_worktree'].includes(error?.message) ? error.message : 'preparation_or_configuration_failed';
  console.log(JSON.stringify({ state: 'stopped', code })); process.exitCode = 2;
}
