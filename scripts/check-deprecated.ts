/**
 * Walks every identifier in the project and flags any whose resolved TypeScript
 * symbol carries a `@deprecated` JSDoc tag. Catches deprecated API usage that
 * `tsc --noEmit` does not surface (deprecations are "suggestion"-level, not
 * errors) and that Biome does not yet detect.
 *
 * Run: `yarn check:deprecated`
 * Exits 1 if any deprecated usage is found (so it can gate CI).
 */

// TypeScript 7 ships no JavaScript compiler API; Microsoft publishes the 6.x
// API as `@typescript/typescript6` for tools like this one. `tsc` itself is 7.
import ts from '@typescript/typescript6';

import path from 'node:path';

const cwd = process.cwd();
const configPath = ts.findConfigFile(cwd, ts.sys.fileExists, 'tsconfig.json');

if (!configPath) {
  console.error('tsconfig.json not found');
  process.exit(1);
}

const raw = ts.readConfigFile(configPath, ts.sys.readFile).config;
const parsed = ts.parseJsonConfigFileContent(raw, ts.sys, path.dirname(configPath));

const program = ts.createProgram({
  rootNames: parsed.fileNames,
  options: parsed.options,
});

const checker = program.getTypeChecker();

const hasDeprecatedTag = (node: ts.Node): boolean =>
  ts.getJSDocTags(node).some((tag) => tag.tagName.text === 'deprecated');

/**
 * A symbol counts as deprecated only when every declaration says so. DOM
 * and library types often deprecate one overload (`getElementsByTagName`
 * for legacy tag names, `querySelector` for a removed selector form) while
 * the others stay current; flagging the whole name would be noise.
 */
function isDeprecatedSymbol(symbol: ts.Symbol | undefined): boolean {
  if (!symbol) return false;
  const resolved = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
  const declarations = resolved.getDeclarations() ?? [];
  if (declarations.length === 0) {
    return resolved.getJsDocTags(checker).some((tag) => tag.name === 'deprecated');
  }
  return declarations.every(hasDeprecatedTag);
}

/** For a call, judge the overload that was actually chosen. */
function isDeprecatedCall(node: ts.CallExpression | ts.NewExpression): boolean {
  const declaration = checker.getResolvedSignature(node)?.getDeclaration();
  return declaration !== undefined && hasDeprecatedTag(declaration);
}

const calleeIdentifier = (
  node: ts.CallExpression | ts.NewExpression,
): ts.Identifier | undefined => {
  const callee = node.expression;
  if (ts.isIdentifier(callee)) return callee;
  if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.name)) return callee.name;
  return undefined;
};

let hits = 0;

for (const sourceFile of program.getSourceFiles()) {
  if (sourceFile.fileName.includes('node_modules')) continue;
  if (!sourceFile.fileName.startsWith(cwd)) continue;

  const report = (node: ts.Identifier): void => {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    console.log(
      `${path.relative(cwd, sourceFile.fileName)}:${line + 1}:${character + 1}  ${node.text}  (@deprecated)`,
    );
    hits++;
  };

  // Callee identifiers are judged by their resolved overload, everything
  // else by its symbol; each identifier is reported at most once.
  const judgedAsCallee = new Set<ts.Identifier>();

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
      const callee = calleeIdentifier(node);
      if (callee) {
        judgedAsCallee.add(callee);
        if (isDeprecatedCall(node)) report(callee);
      }
    } else if (ts.isIdentifier(node) && !judgedAsCallee.has(node)) {
      if (isDeprecatedSymbol(checker.getSymbolAtLocation(node))) report(node);
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
}

if (hits === 0) {
  console.log('✓ No deprecated API usage found.');
  process.exit(0);
}

console.log(`\n${hits} deprecated symbol use(s) found.`);
process.exit(1);
