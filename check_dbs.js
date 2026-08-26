import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

// Remove the hardcoded db to get default config
const defaultConfig = { ...config };
delete defaultConfig.firestoreDatabaseId;

const aiConfig = { ...config, firestoreDatabaseId: "ai-studio-3862500a-e889-46ab-9dd5-e9b2052c184d" };

const appDefault = initializeApp(defaultConfig, 'defaultApp');
const appAi = initializeApp(aiConfig, 'aiApp');

const dbDefault = getFirestore(appDefault);
const dbAi = getFirestore(appAi, "ai-studio-3862500a-e889-46ab-9dd5-e9b2052c184d");

async function checkDb(db, name) {
  try {
    const orgsRef = collection(db, 'organizations');
    const snap = await getDocs(orgsRef);
    console.log(`Database [${name}]:`);
    console.log(`- Found ${snap.size} organizations.`);
    if (snap.size > 0) {
      snap.docs.forEach(doc => {
        console.log(`  * ${doc.id} - ${doc.data().name} (Created by: ${doc.data().creatorEmail})`);
      });
    }
  } catch (error) {
    console.log(`Database [${name}] Error:`, error.message);
  }
}

async function run() {
  console.log("Checking databases...");
  await checkDb(dbDefault, "default");
  await checkDb(dbAi, "ai-studio");
  process.exit(0);
}

run();
