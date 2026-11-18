import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, extname } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const displayOnlyModules = [
  'src/lib/coachingCompass/vmaReference.ts',
  'src/lib/coachingCompass/factorVerdict.ts',
  'src/lib/coachingCompass/referenceRegistry.ts',
  'src/lib/coachingCompass/profileComparison.ts',
  'src/lib/coachingCompass/objectiveReading.ts',
].map(file => resolve(root, file));

function resolveModule(from: string, specifier: string): string | undefined {
  const base = specifier.startsWith('@/') ? resolve(root, 'src', specifier.slice(2))
    : specifier.startsWith('.') ? resolve(dirname(from), specifier) : undefined;
  if (!base) return undefined;
  return [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}/index.ts`, `${base}/index.tsx`]
    .find(file => existsSync(file) && ['.ts', '.tsx', '.js'].includes(extname(file)));
}

/** Follow runtime imports, including re-exports; type-only references cannot prescribe. */
function runtimeDependencies(file: string): string[] {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const dependencies: string[] = [];
  function add(specifier: ts.Node | undefined) {
    if (!specifier || !ts.isStringLiteral(specifier)) return;
    const dependency = resolveModule(file, specifier.text);
    if (dependency) dependencies.push(dependency);
  }
  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node)) {
      const clause = node.importClause;
      const bindings = clause?.namedBindings;
      const onlyTypes = clause?.isTypeOnly || (clause && !clause.name && bindings &&
        ts.isNamedImports(bindings) && bindings.elements.length > 0 && bindings.elements.every(item => item.isTypeOnly));
      if (!onlyTypes) add(node.moduleSpecifier);
    } else if (ts.isExportDeclaration(node) && !node.isTypeOnly) {
      const clause = node.exportClause;
      const onlyTypes = clause && ts.isNamedExports(clause) && clause.elements.length > 0 &&
        clause.elements.every(item => item.isTypeOnly);
      if (!onlyTypes) add(node.moduleSpecifier);
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      add(node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return dependencies;
}

describe('Compass comparisons stay outside prescription', () => {
  const entrypoints = [
    'src/engines/diagnostic/computeDiagnostic.ts',
    'src/lib/v2/unifiedLimiterDetection.ts',
    'src/engines/plan/planConfigBuilder.ts',
    'src/hooks/useAITrainingPlan.ts',
    'integrations/det/DetCoachPanel.tsx',
    'supabase/functions/ai-training-plan/index.ts',
    'supabase/functions/ai-training-plan-test/index.ts',
  ];

  for (const entrypoint of entrypoints) {
    it(`${entrypoint} cannot consume display-only comparisons, even indirectly`, () => {
      const visited = new Set<string>();
      function walk(file: string) {
        if (visited.has(file)) return;
        visited.add(file);
        runtimeDependencies(file).forEach(walk);
      }
      walk(resolve(root, entrypoint));
      expect(displayOnlyModules.filter(file => visited.has(file))).toEqual([]);
    });
  }

  it('resolves direct imports and public re-exports to the same guarded module', () => {
    const from = resolve(root, 'src/lib/coachingCompass/index.ts');
    expect(resolveModule(from, './vmaReference')).toBe(displayOnlyModules[0]);
    expect(resolveModule(from, '@/lib/coachingCompass/factorVerdict')).toBe(displayOnlyModules[1]);
  });
});