import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function inspectOrg(orgId, orgName) {
  console.log(`\n================== ${orgName} (${orgId}) ==================`);
  
  // Classes
  const classesSnap = await getDocs(collection(db, `organizations/${orgId}/classes`));
  const class2 = classesSnap.docs.find(d => d.data().name.includes("২য়") || d.data().name.includes("দ্বিতীয়") || d.data().name.includes("2"));
  console.log("Class 2 found:", class2 ? { id: class2.id, name: class2.data().name } : "Not found!");

  // Exams
  const examsSnap = await getDocs(collection(db, `organizations/${orgId}/exams`));
  const exam2 = examsSnap.docs.find(d => d.data().name.includes("২য়") || d.data().name.includes("দ্বিতীয়") || d.data().name.includes("2"));
  console.log("Exam 2 found:", exam2 ? { id: exam2.id, name: exam2.data().name, year: exam2.data().academicYearId } : "Not found!");

  // Academic years
  const yearsSnap = await getDocs(collection(db, `organizations/${orgId}/academic_years`));
  console.log("Academic Years:", yearsSnap.docs.map(d => ({ id: d.id, name: d.data().year_name, is_active: d.data().is_active })));

  // Results in org
  const resultsSnap = await getDocs(collection(db, `organizations/${orgId}/results`));
  console.log(`Total results docs in org: ${resultsSnap.docs.length}`);

  if (class2 && exam2) {
    const class2Exam2Docs = resultsSnap.docs.filter(d => {
      const data = d.data();
      return data.class_id === class2.id && data.exam_id === exam2.id;
    });
    console.log(`Docs for Class 2 & Exam 2: ${class2Exam2Docs.length}`);
    const statusCount = {};
    class2Exam2Docs.forEach(d => {
      const st = d.data().status || (d.data().type === 'config' ? 'config' : 'undefined');
      statusCount[st] = (statusCount[st] || 0) + 1;
    });
    console.log("Statuses for Class 2 & Exam 2:", statusCount);
    if (class2Exam2Docs.length > 0) {
      console.log("Sample doc:", JSON.stringify(class2Exam2Docs[0].data(), null, 2));
    }
  }
}

async function run() {
  await inspectOrg("org-1782293383824-437", "এস.এম সরকারি প্রাথমিক বিদ্যালয়");
  await inspectOrg("org-1774260606079-122", "দারুল উলুম দত্তপাড়া মাদরাসা");
}

run().catch(console.error).then(() => process.exit(0));
