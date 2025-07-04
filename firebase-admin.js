import admin from 'firebase-admin';
import { readFileSync } from 'fs';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'))),
  });
}

const db = admin.firestore();
export { admin, db };
