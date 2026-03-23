import { doc, runTransaction } from "firebase/firestore";
import { db } from "../firebase";

// ১. মাদরাসা আইডি জেনারেট করার ফাংশন
export const generateMadrasaId = async (): Promise<number> => {
  const counterRef = doc(db, "counters", "madrasa_counter");
  
  return await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    const currentId = counterDoc.exists() ? counterDoc.data().last_id : 99;
    const newId = currentId + 1;
    
    transaction.set(counterRef, { last_id: newId });
    return newId;
  });
};

// ২. স্টুডেন্ট আইডি জেনারেট করার ফাংশন
export const generateStudentId = async (madrasaId: number, year: number): Promise<string> => {
  const yearStr = year.toString().slice(-2); // ২০২৬ -> ২৬
  // Fix: Document references must have an even number of segments
  // Changed from counters/students/${madrasaId}/years/${year} to counters/students_${madrasaId}_${year}
  const counterRef = doc(db, "counters", `students_${madrasaId}_${year}`);
  
  return await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    const currentSerial = counterDoc.exists() ? counterDoc.data().last_serial : 0;
    const newSerial = currentSerial + 1;
    
    transaction.set(counterRef, { last_serial: newSerial });
    
    // আইডি ফরম্যাট: [Madrasa ID] + [Year] + [Serial]
    const serialStr = newSerial.toString().padStart(3, '0');
    return `${madrasaId}${yearStr}${serialStr}`;
  });
};
