#!/usr/bin/env node
/**
 * Guard anti-EnrichLead: impide que un secreto de servidor acabe (a) commiteado
 * en el repo, o (b) empaquetado en el bundle que se descarga en el navegador.
 *
 * Falla el build (exit 1) si detecta algo. Se ejecuta en `prebuild` (local, sobre
 * el código) y en CI tras `npm run build` (sobre dist/ real). Sin dependencias.
 *
 * La lección: el navegador nunca es de fiar. Todo lo VITE_* se empaqueta y es
 * público. Los secretos viven SOLO en process.env del servidor.
 */
import { execSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Patrones de secretos reales que jamás deben estar en texto (repo ni bundle).
const SECRET_PATTERNS = [
  { name: 'Stripe secret key',      re: /sk_(live|test)_[A-Za-z0-9]{16,}/ },
  { name: 'Stripe webhook secret',  re: /whsec_[A-Za-z0-9]{16,}/ },
  { name: 'Private key (PEM)',      re: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/ },
  { name: 'GitHub PAT',             re: /(ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{22,})/ },
  { name: 'Google service-account private_key', re: /"private_key"\s*:\s*"-----BEGIN/ },
];

// Nombres de variable que son secretos de servidor: prohibido prefijo VITE_
// (VITE_ = se inyecta en el bundle del cliente = público).
const SERVER_SECRET_HINT = /VITE_[A-Z0-9_]*(SECRET|STRIPE|GEMINI|GENAI|PRIVATE|SERVICE_ACCOUNT|WEBHOOK|_TOKEN|PASSWORD|APOLLO)/;

// ponytail: NO perseguimos la Firebase client apiKey (AIza...). Es pública por diseño
// —la seguridad vive en firestore.rules, no en la key— y aparece en el bundle a propósito.

// self-check aislado: verifica que los patrones detectan lo que deben, sin escanear el repo.
if (process.argv.includes('--selftest')) {
  const cases = ['sk_live_ABCDEFGHIJKLMNOP1234', 'whsec_ABCDEFGHIJKLMNOP1234', 'VITE_STRIPE_SECRET_KEY=foo', '-----BEGIN PRIVATE KEY-----'];
  for (const c of cases) {
    if (!(SECRET_PATTERNS.some(p => p.re.test(c)) || SERVER_SECRET_HINT.test(c))) {
      console.error('selftest FALLÓ para:', c); process.exit(2);
    }
  }
  console.log('✅ selftest OK'); process.exit(0);
}

const violations = [];

function scanText(label, text) {
  for (const { name, re } of SECRET_PATTERNS) {
    const m = text.match(re);
    if (m) violations.push(`${label}: ${name} → "${m[0].slice(0, 12)}…"`);
  }
  const vite = text.match(SERVER_SECRET_HINT);
  if (vite) violations.push(`${label}: secreto de servidor con prefijo VITE_ (llega al navegador) → "${vite[0]}"`);
}

// 1) Archivos trackeados por git (los locales .env gitignorados quedan fuera, correcto).
const tracked = execSync('git ls-files', { encoding: 'utf8' })
  .split('\n')
  .filter(f => f && /\.(ts|tsx|js|mjs|cjs|json|env|example|yml|yaml|html)$/.test(f))
  .filter(f => f !== 'scripts/check-secrets.mjs' && f !== 'package-lock.json');

for (const f of tracked) {
  try { scanText(f, readFileSync(f, 'utf8')); } catch { /* binario o ilegible: ignorar */ }
}

// 2) Bundle real, si existe (CI corre esto tras `npm run build`).
function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(js|html|css|map)$/.test(entry)) {
      try { scanText(`dist/${p}`, readFileSync(p, 'utf8')); } catch {}
    }
  }
}
if (existsSync('dist')) walk('dist');

if (violations.length) {
  console.error('\n❌ check-secrets: se detectaron secretos expuestos:\n');
  for (const v of violations) console.error('   • ' + v);
  console.error('\nLos secretos van SOLO en process.env del servidor, nunca en el repo ni con prefijo VITE_.\n');
  process.exit(1);
}

console.log('✅ check-secrets: sin secretos expuestos en repo ni bundle.');
