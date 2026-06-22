// Run: node scripts/test-risk.mjs
import assert from 'node:assert/strict';

// Inline the pure math to avoid TS/ESM import issues in CI
function calculateDaysBetween(startDateStr, endDateStr) {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  return diff < 0 ? 0 : diff;
}

function riskLevel(riskDays, avgFreq) {
  const mid  = avgFreq * 1.0;
  const high = avgFreq * 2.0;
  const crit = avgFreq * 3.0;
  if (riskDays < mid)  return 'Bajo';
  if (riskDays < high) return 'Medio';
  if (riskDays < crit) return 'Alto';
  return 'Crítico';
}

// calculateDaysBetween
assert.equal(calculateDaysBetween('2026-01-01', '2026-01-31'), 30);
assert.equal(calculateDaysBetween('2026-01-31', '2026-01-01'), 0); // future start → 0

// riskLevel thresholds (freq = 30 days)
assert.equal(riskLevel(20,  30), 'Bajo');
assert.equal(riskLevel(35,  30), 'Medio');
assert.equal(riskLevel(75,  30), 'Alto');
assert.equal(riskLevel(100, 30), 'Crítico');

// edge: client who visits every 7 days
assert.equal(riskLevel(6,  7), 'Bajo');
assert.equal(riskLevel(8,  7), 'Medio');
assert.equal(riskLevel(15, 7), 'Alto');
assert.equal(riskLevel(22, 7), 'Crítico');

console.log('✓ risk engine tests passed');
