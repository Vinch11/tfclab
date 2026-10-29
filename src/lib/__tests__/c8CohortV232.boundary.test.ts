import { expect, it } from "vitest";
import ts from "typescript";
import path from "node:path";

it("R1: legacy symbols cannot enter diagnostic or planning through direct, barrel, namespace or dynamic imports", () => {
  const root = process.cwd();
  const config = ts.parseJsonConfigFileContent(ts.readConfigFile("tsconfig.app.json", ts.sys.readFile).config, ts.sys, root);
  const protectedPath = (file: string) => !file.includes("__tests__") &&
    (file.startsWith(path.join(root, "src/engines/diagnostic/")) || file.startsWith(path.join(root, "src/engines/plan/")) || file === path.join(root, "src/hooks/useAITrainingPlan.ts"));
  // Compile the protected roots and their transitive dependencies, not unrelated UI/tests.
  const roots = [...config.fileNames.filter(protectedPath), path.join(root, "src/lib/v2/index.ts"), path.join(root, "src/lib/v2/vlamaxV2Engine.ts")];
  const program = ts.createProgram(roots, config.options), checker = program.getTypeChecker();
  const legacy = path.join(root, "src/lib/v2/vlamaxV2.ts");
  const isLegacy = (original: ts.Symbol | undefined): boolean => {
    let s = original; const seen = new Set<ts.Symbol>();
    while (s && (s.flags & ts.SymbolFlags.Alias) && !seen.has(s)) { seen.add(s); s = checker.getAliasedSymbol(s); }
    return !!s?.declarations?.some(d => d.getSourceFile().fileName === legacy);
  };
  const moduleHasLegacy = (specifier: ts.Expression, from: string): boolean => {
    if (!ts.isStringLiteralLike(specifier)) return true; // unresolvable dynamic access cannot prove isolation
    const resolved = ts.resolveModuleName(specifier.text, from, config.options, ts.sys).resolvedModule?.resolvedFileName;
    const sf = resolved ? program.getSourceFile(resolved) : undefined;
    const symbol = sf ? checker.getSymbolAtLocation(sf) : undefined;
    return !!symbol && checker.getExportsOfModule(symbol).some(isLegacy);
  };
  const protectedFiles = program.getSourceFiles().filter(sf => protectedPath(sf.fileName));
  const violations: string[] = [];
  const queue = [...protectedFiles], visited = new Set<string>();
  const follow = (original: ts.Symbol | undefined) => {
    let symbol = original;
    if (symbol && (symbol.flags & ts.SymbolFlags.Alias)) symbol = checker.getAliasedSymbol(symbol);
    if (!symbol || !(symbol.flags & ts.SymbolFlags.Value)) return;
    for (const declaration of symbol.declarations ?? []) {
      const sf = declaration.getSourceFile();
      if (sf.fileName.startsWith(path.join(root, "src/")) && !sf.fileName.includes("__tests__") && !visited.has(sf.fileName)) queue.push(sf);
    }
  };
  const followModule = (specifier: ts.Expression, from: string) => {
    if (!ts.isStringLiteralLike(specifier)) return;
    const resolved = ts.resolveModuleName(specifier.text, from, config.options, ts.sys).resolvedModule?.resolvedFileName;
    const sf = resolved ? program.getSourceFile(resolved) : undefined;
    if (sf && sf.fileName.startsWith(path.join(root, "src/"))) queue.push(sf);
  };
  while (queue.length) {
    const sf = queue.shift()!; if (visited.has(sf.fileName)) continue; visited.add(sf.fileName);
    const walk = (n: ts.Node) => {
      if (ts.isImportDeclaration(n) && !n.importClause?.isTypeOnly) {
        const bindings = n.importClause?.namedBindings;
        if (bindings && ts.isNamedImports(bindings)) {
          for (const binding of bindings.elements) if (!binding.isTypeOnly) {
            const symbol = checker.getSymbolAtLocation(binding.name);
            if (isLegacy(symbol)) violations.push(`${sf.fileName}:${binding.name.text}`);
            else follow(symbol);
          }
        } else if (moduleHasLegacy(n.moduleSpecifier, sf.fileName)) violations.push(`${sf.fileName}:namespace/default/side-effect legacy import`);
        else followModule(n.moduleSpecifier, sf.fileName);
        if (n.importClause?.name) follow(checker.getSymbolAtLocation(n.importClause.name));
      }
      if (ts.isExportDeclaration(n) && !n.isTypeOnly && n.moduleSpecifier) {
        if (n.exportClause && ts.isNamedExports(n.exportClause)) {
          for (const e of n.exportClause.elements) if (!e.isTypeOnly) {
            const symbol = checker.getSymbolAtLocation(e.name);
            if (isLegacy(symbol)) violations.push(`${sf.fileName}:legacy export ${e.name.text}`); else follow(symbol);
          }
        } else if (moduleHasLegacy(n.moduleSpecifier, sf.fileName)) violations.push(`${sf.fileName}:legacy export namespace`);
        else followModule(n.moduleSpecifier, sf.fileName);
      }
      if (ts.isCallExpression(n) && (n.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(n.expression) && n.expression.text === "require"))) {
        if (!n.arguments[0] || moduleHasLegacy(n.arguments[0], sf.fileName)) violations.push(`${sf.fileName}:legacy dynamic access`);
        else followModule(n.arguments[0], sf.fileName);
      }
      ts.forEachChild(n, walk);
    }; walk(sf);
  }
  // Positive control: resolve the dangerous barrel symbol, distinguish the current engine.
  const barrel = checker.getSymbolAtLocation(program.getSourceFile(path.join(root, "src/lib/v2/index.ts"))!)!;
  expect(isLegacy(checker.getExportsOfModule(barrel).find(s => s.name === "computeVLamaxV2"))).toBe(true);
  const modern = checker.getSymbolAtLocation(program.getSourceFile(path.join(root, "src/lib/v2/vlamaxV2Engine.ts"))!)!;
  expect(isLegacy(checker.getExportsOfModule(modern).find(s => s.name === "computeVLamaxV2"))).toBe(false);
  expect(protectedFiles.length).toBeGreaterThan(2);
  expect(visited.has(path.join(root, "src/lib/vlamaxEffectif.ts"))).toBe(true);
  expect(visited.has(path.join(root, "src/lib/v2/vlamaxV2Engine.ts"))).toBe(true);
  expect(violations).toEqual([]);
}, 30_000);
