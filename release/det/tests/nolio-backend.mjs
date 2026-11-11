import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// A Supabase bundle can use a function's own files and its shared directory.
function verifyImports(entry, ownDirectory, sharedDirectory) {
  const pending = new Set([entry]);
  for (const file of pending) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)['"](\.[^'"]+)['"]/g)) {
      const imported = path.resolve(path.dirname(file), match[1]);
      assert.ok(
        imported.startsWith(ownDirectory + path.sep) || imported.startsWith(sharedDirectory + path.sep),
        `Import hors de la fonction et de son dossier partagé : ${file} → ${match[1]}`,
      );
      pending.add(imported);
    }
  }
}

const target = mkdtempSync(path.join(tmpdir(), 'det-nolio-functions-'));
try {
  const builder = fileURLToPath(new URL('../build-nolio-backend.mjs', import.meta.url));
  execFileSync(process.execPath, [builder, target]);
  const functions = path.join(target, 'supabase', 'functions');
  const shared = path.join(functions, '_shared', 'det-nolio-v2');
  for (const name of ['det-nolio-connect', 'det-nolio-callback', 'det-nolio-export']) {
    const directory = path.join(functions, name);
    verifyImports(path.join(directory, 'index.ts'), directory, shared);
  }
} finally {
  rmSync(target, { recursive: true, force: true });
}
