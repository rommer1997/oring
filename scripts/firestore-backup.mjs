import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { writeFileSync, mkdirSync } from 'fs';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const COLLECTIONS = ['tenants', 'users'];
const date = new Date().toISOString().split('T')[0];
const outDir = `backups/${date}`;
mkdirSync(outDir, { recursive: true });

for (const col of COLLECTIONS) {
  const snap = await db.collection(col).get();
  const data = {};
  for (const doc of snap.docs) {
    data[doc.id] = doc.data();
    // Sub-colecciones clave
    const subCols = ['appointments', 'clients', 'agent_campaigns', 'staff'];
    for (const sub of subCols) {
      const subSnap = await db.collection(`${col}/${doc.id}/${sub}`).get();
      if (!subSnap.empty) {
        data[doc.id][`_${sub}`] = {};
        for (const subDoc of subSnap.docs) {
          data[doc.id][`_${sub}`][subDoc.id] = subDoc.data();
        }
      }
    }
  }
  writeFileSync(`${outDir}/${col}.json`, JSON.stringify(data, null, 2));
  console.log(`✓ ${col}: ${snap.size} docs`);
}

console.log(`Backup completo → ${outDir}`);
