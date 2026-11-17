#!/usr/bin/env node
// Requirement -> test traceability (make traceability).
//
// Each test file declares the requirements it checks on its first line:
//   // @req F-LIB-04 F-LIB-03
// This script joins those tags with the requirement list in
// docs/requirements/features_priority.md and prints a Markdown report:
// tests per requirement and layer, requirements without tests, and test
// files without a tag.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const REQ_ID = /\bF-[A-Z]+-\d+\b/g;

// --- requirements: first row that names an ID gives its name and tier ---
const requirements = new Map();
let tier = 'Core';
for (const line of readFileSync(join(root, 'docs/requirements/features_priority.md'), 'utf8').split('\n')) {
  if (line.startsWith('## Tier 2')) tier = 'Extra';
  if (line.startsWith('## Tier 3')) tier = 'Optional';
  if (line.startsWith('## Requirements that change')) break;
  // "| F-ID | Name |" (Core, Optional) or "| 3 | F-ID | Name |" (Extras)
  const m = line.match(/^\|\s*(?:\d+\s*\|\s*)?(F-[A-Z]+-\d+)\s*\|\s*([^|]+)\|/);
  if (m && !requirements.has(m[1])) {
    requirements.set(m[1], { name: m[2].replaceAll('**', '').trim(), tier });
  }
}

// --- test files and their tags ---
const testFile = /\.(test|spec)\.ts$/;
const skipDir = new Set(['node_modules', 'dist', 'coverage', 'reports', '.stryker-tmp']);
function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (skipDir.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (testFile.test(name)) yield path;
  }
}

function layerOf(path) {
  if (path.includes('/backend/tests/unit/')) return 'unit';
  if (path.includes('/backend/tests/integration/')) return 'integration';
  if (path.includes('/frontend/e2e/')) return 'e2e';
  return 'component';
}
const LAYERS = ['unit', 'integration', 'component', 'e2e'];
// it(...), test(...), test.only/skip(...), it.each(...)(...) but not test.describe / test.beforeEach
const TEST_CASE = /^\s*(?:it|test)(?:\.(?:only|skip|todo|fails|concurrent))?(?:\.each\(.*?\))?\(/;

const perReq = new Map();
const untagged = [];
let totalTests = 0;
for (const path of walk(join(root, 'apps'))) {
  const text = readFileSync(path, 'utf8');
  const tests = text.split('\n').filter((l) => TEST_CASE.test(l)).length;
  totalTests += tests;
  const tagLine = text.split('\n').find((l) => l.includes('@req'));
  const ids = tagLine?.match(REQ_ID) ?? [];
  const rel = relative(root, path);
  if (ids.length === 0) {
    untagged.push({ rel, tests });
    continue;
  }
  for (const id of ids) {
    if (!perReq.has(id)) perReq.set(id, { files: 0, unit: 0, integration: 0, component: 0, e2e: 0 });
    const row = perReq.get(id);
    row.files += 1;
    row[layerOf(path)] += tests;
  }
}

// --- report ---
const unknown = [...perReq.keys()].filter((id) => !requirements.has(id));
const tierOrder = { Core: 0, Extra: 1, Optional: 2 };
const shown = [...requirements]
  .filter(([id, r]) => r.tier !== 'Optional' || perReq.has(id))
  .sort(([a, ra], [b, rb]) => tierOrder[ra.tier] - tierOrder[rb.tier] || a.localeCompare(b));

const out = [];
out.push('| Requirement | Name | Tier | Files | Unit | Integration | Component | E2E | Total |');
out.push('|---|---|---|---:|---:|---:|---:|---:|---:|');
for (const [id, r] of shown) {
  const row = perReq.get(id);
  if (!row) {
    out.push(`| ${id} | ${r.name} | ${r.tier} | 0 | | | | | **none** |`);
    continue;
  }
  const total = LAYERS.reduce((s, l) => s + row[l], 0);
  out.push(`| ${id} | ${r.name} | ${r.tier} | ${row.files} | ${LAYERS.map((l) => row[l] || '').join(' | ')} | ${total} |`);
}

const planned = shown.filter(([, r]) => r.tier !== 'Optional');
const tested = (tier) => planned.filter(([id, r]) => r.tier === tier && perReq.has(id)).length;
const count = (tier) => planned.filter(([, r]) => r.tier === tier).length;
out.push('');
out.push(`- Core requirements with tests: **${tested('Core')} of ${count('Core')}**`);
out.push(`- Extra requirements with tests: **${tested('Extra')} of ${count('Extra')}** (not all are built yet)`);
out.push(`- Test cases: ${totalTests}, of which ${totalTests - untagged.reduce((s, f) => s + f.tests, 0)} are tagged with a requirement`);
if (untagged.length) {
  out.push('');
  out.push('Test files without a requirement (infrastructure, or a tag is missing):');
  for (const f of untagged) out.push(`- \`${f.rel}\` (${f.tests} tests)`);
}
if (unknown.length) {
  out.push('');
  out.push(`Tags that are not in features_priority.md: ${unknown.join(', ')}`);
  process.exitCode = 1;
}
console.log(out.join('\n'));
