import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const orgId = "org-1782293383824-437";
const classId = "class-1782303264801"; // ২য় শ্রেণি
const examId = "exam-1786157125932"; // দ্বিতীয় প্রান্তিক
const yearId = "ay-1782293828227"; // ২০২৫-২০২৬

async function run() {
  const resultsRef = collection(db, `organizations/${orgId}/results`);
  const q = query(
    resultsRef,
    where("academic_year_id", "==", yearId),
    where("exam_id", "==", examId),
    where("class_id", "==", classId),
    where("status", "==", "published")
  );
  const snap = await getDocs(q);
  console.log("Found published docs:", snap.docs.length);

  const studentsSnap = await getDocs(collection(db, `organizations/${orgId}/students`));
  const class2Students = studentsSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(s => s.classId === classId);
  console.log(`Total students in Class 2: ${class2Students.length}`);
  class2Students.slice(0, 5).forEach(s => console.log("Student:", s.id, s.name, "Roll:", s.roll));

  const subjectsSnap = await getDocs(collection(db, `organizations/${orgId}/subjects`));
  const class2Subjects = subjectsSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(s => s.classId === classId);
  console.log(`Total subjects for Class 2: ${class2Subjects.length}`);
  class2Subjects.forEach(s => console.log("Subject:", s.id, s.name));

  console.log("\nSample 5 result docs:");
  snap.docs.slice(0, 5).forEach(d => {
    console.log(d.id, "=>", d.data());
  });
}

run().catch(console.error).then(() => process.exit(0));
