/**
 * Walks every identifier in the project and flags any whose resolved TypeScript
 * symbol carries a `@deprecated` JSDoc tag. Catches deprecated API usage that
 * `tsc --noEmit` does not surface (deprecations are "suggestion"-level, not
 * errors) and that Biome does not yet detect.
 *
 * Run: `yarn check:deprecated`
 * Exits 1 if any deprecated usage is found (so it can gate CI).
 */
import path from 'node:path';
import ts from 'typescript';

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

function isDeprecated(sym: ts.Symbol | undefined): boolean {
  if (!sym) return false;
  return sym.getJsDocTags(checker).some((tag) => tag.name === 'deprecated');
}

let hits = 0;

for (const sourceFile of program.getSourceFiles()) {
  if (sourceFile.fileName.includes('node_modules')) continue;
  if (!sourceFile.fileName.startsWith(cwd)) continue;

  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node)) {
      const sym = checker.getSymbolAtLocation(node);
      if (isDeprecated(sym)) {
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        console.log(
          `${path.relative(cwd, sourceFile.fileName)}:${line + 1}:${character + 1}  ${node.text}  (@deprecated)`,
        );
        hits++;
      }
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
