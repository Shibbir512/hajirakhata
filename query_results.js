import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function run() {
  const orgId = "3862500a-e889-46ab-9dd5-e9b2052c184d";
  const resultsRef = db.collection(`organizations/${orgId}/results`);
  const snapshot = await resultsRef.get();
  
  let total = 0;
  let published = 0;
  let byClass = {};
  
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.type !== 'config') {
      total++;
      if (data.status === 'published') published++;
      
      const key = `${data.class_id} - ${data.exam_id}`;
      if (!byClass[key]) byClass[key] = { total: 0, published: 0 };
      byClass[key].total++;
      if (data.status === 'published') byClass[key].published++;
    }
  });
  
  console.log(`Total results: ${total}`);
  console.log(`Published results: ${published}`);
  console.log(JSON.stringify(byClass, null, 2));
}

run().catch(console.error);
