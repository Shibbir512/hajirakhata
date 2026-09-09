import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
  const orgId = "3862500a-e889-46ab-9dd5-e9b2052c184d";
  const resultsRef = collection(db, `organizations/${orgId}/results`);
  const snapshot = await getDocs(resultsRef);
  
  let classes = {};
  
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.type !== 'config') {
      const key = `${data.class_id}_${data.exam_id}`;
      if (!classes[key]) classes[key] = { count: 0, statuses: {}, sample: data };
      classes[key].count++;
      classes[key].statuses[data.status || 'undefined'] = (classes[key].statuses[data.status || 'undefined'] || 0) + 1;
    }
  });
  
  console.log(JSON.stringify(classes, null, 2));
}

run().catch(console.error).then(() => process.exit(0));
