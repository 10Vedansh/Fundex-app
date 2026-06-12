import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));

const funds = JSON.parse(readFileSync(join(__dirname, 'funds_data.json'), 'utf-8'));
const fundMap = new Map(funds.map(f => [f.id, f]));

function parseCsvLine(line: string): string[] {
  const vals: string[] = []; let cur = '', q = false;
  for (const ch of line) { if (ch === '"') { q = !q; continue; } if (ch === ',' && !q) { vals.push(cur); cur = ''; continue; } cur += ch; }
  vals.push(cur); return vals;
}
const lines = readFileSync(join(__dirname, 'output', 'persona_recommendations.csv'), 'utf-8').trim().split('\n');
const h = parseCsvLine(lines[0]);
const rows = lines.slice(1).map(parseCsvLine).map(v => { const r: any = {}; h.forEach((x, i) => r[x.trim()] = v[i]); return r; });

function getAge(fid: string): number | null {
  const f = fundMap.get(fid);
  if (!f?.launch) return null;
  return (Date.now() - new Date(String(f.launch)).getTime()) / (365.25 * 24 * 3600 * 1000);
}

const t3 = rows.filter(r => parseInt(r.rank) <= 3 && parseInt(r.null_fields) > 0);
console.log('=== Top 3 missing-metric fund ages ===\n');
for (const r of t3) {
  const age = getAge(r.fund_id);
  const agestr = age !== null ? `${age.toFixed(1)}y ${age < 2 ? '<2y' : '>=2y'}` : 'N/A';
  console.log(`${r.fund_name.padEnd(55)} age=${agestr.padEnd(12)} nulls=${r.null_fields} score=${r.score}`);
}

const allTop10 = rows.filter(r => parseInt(r.rank) <= 10);
console.log('\n=== ALL Top 10 by age bracket ===\n');
const brackets = [
  ['< 1 year', (a: number|null) => a !== null && a < 1],
  ['1-2 years', (a: number|null) => a !== null && a >= 1 && a < 2],
  ['2-3 years', (a: number|null) => a !== null && a >= 2 && a < 3],
  ['3-5 years', (a: number|null) => a !== null && a >= 3 && a < 5],
  ['5+ years', (a: number|null) => a !== null && a >= 5],
  ['No date', (a: number|null) => a === null],
];
for (const [label, test] of brackets) {
  const matched = allTop10.filter(r => test(getAge(r.fund_id)));
  console.log(`${label.padEnd(12)} ${matched.length.toString().padStart(3)} instances`);
  const names = new Set(matched.map(r => r.fund_name));
  console.log(`  Unique funds: ${names.size}`);
}

console.log('\n=== Simulation B impact: what changes ===\n');
// Funds < 2yr in current Top 3 that would be blocked
const blocked = t3.filter(r => { const a = getAge(r.fund_id); return a !== null && a < 2; });
console.log(`Funds < 2yr currently in Top 3: ${blocked.length}`);
for (const r of blocked) {
  console.log(`  ${r.fund_name} (age: ${getAge(r.fund_id)?.toFixed(1)}y, rank: ${r.rank}, persona: ${r.persona_name})`);
}
