import * as fs from 'node:fs';
import * as path from 'node:path';

const checkOnly = process.argv.includes('--check');

const envPath = path.join(process.cwd(), '.env');
const examplePath = path.join(process.cwd(), '.env.example');

if (!fs.existsSync(envPath)) {
  console.log('⚠️  No .env file found. Skipping sync.');
  process.exit(0);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const lines = envContent.split('\n');

let isPublicBlock = false;

const exampleLines = lines.map((line) => {
  const trimmed = line.trim();

  // Preserve empty lines and reset public block state
  if (!trimmed) {
    isPublicBlock = false;
    return line;
  }

  // Preserve comments
  if (trimmed.startsWith('#')) {
    if (line.toLowerCase().includes('-public')) {
      isPublicBlock = true;
    }
    return line;
  }

  // Parse KEY=VALUE
  // Matches "KEY=" or "KEY=VALUE" or "KEY=  VALUE"
  const match = line.match(/^([^=]+)=(.*)$/);

  if (match) {
    const key = match[1];

    // Check for explicit public marker
    // e.g. KEY=VAL # -public
    // OR if previous comment block marked it public
    if (isPublicBlock || line.toLowerCase().includes('-public')) {
      isPublicBlock = false; // Reset after consumption
      return line;
    }

    isPublicBlock = false; // Reset for next item
    // Return KEY= with empty value
    return `${key}=`;
  }

  // Fallback for lines that don't match standard env format
  isPublicBlock = false;
  return line;
});

const newExampleContent = exampleLines.join('\n');

let currentExampleContent = '';
if (fs.existsSync(examplePath)) {
  currentExampleContent = fs.readFileSync(examplePath, 'utf-8');
}

if (currentExampleContent === newExampleContent) {
  console.log('✨ .env.example is already up to date');
  process.exit(0);
}

if (checkOnly) {
  console.error('❌ .env.example is out of sync with .env. Run "yarn env:sync" to update.');
  process.exit(1);
}

fs.writeFileSync(examplePath, newExampleContent);
console.log('✅ Synchronized .env.example with .env');
