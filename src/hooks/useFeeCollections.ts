import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';

export interface FeePayment {
  categoryId: string;
  amount: number;
}

export interface FeeCollectionRecord {
  id: string;
  orgId: string;
  studentId: string;
  classId: string;
  hijriYear: number;
  hijriMonth: number; // 1 to 12
  payments: FeePayment[]; // Array of payments made in this transaction/month
  totalAmount: number;
  datePaid: any;
  collectedBy: string; // User ID or Name
  receiptNo?: string;
}

export const useFeeCollections = (orgId: string | undefined, hijriYear?: number, hijriMonth?: number, classId?: string) => {
  const [collections, setCollections] = useState<FeeCollectionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) {
      setCollections([]);
      setLoading(false);
      return;
    }

    let q = query(collection(db, 'feeCollections'), where('orgId', '==', orgId));
    
    if (hijriYear) {
      q = query(q, where('hijriYear', '==', hijriYear));
    }
    if (hijriMonth) {
      q = query(q, where('hijriMonth', '==', hijriMonth));
    }
    if (classId) {
      q = query(q, where('classId', '==', classId));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records: FeeCollectionRecord[] = [];
      snapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() } as FeeCollectionRecord);
      });
      setCollections(records);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching fee collections:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orgId, hijriYear, hijriMonth, classId]);

  const addCollection = async (
    studentId: string, 
    targetClassId: string, 
    year: number, 
    month: number, 
    payments: FeePayment[], 
    totalAmount: number,
    collectedBy: string,
    isBulk: boolean = false
  ) => {
    if (!orgId) return;
    try {
      // Check if already paid for this month to avoid duplicates, or allow multiple partial payments?
      // For simplicity, let's allow multiple or just add. Usually, it's better to update if exists.
      // Let's check if a record exists for this student, year, month.
      const q = query(
        collection(db, 'feeCollections'), 
        where('orgId', '==', orgId),
        where('studentId', '==', studentId),
        where('hijriYear', '==', year),
        where('hijriMonth', '==', month)
      );
      
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        // Update existing record
        const existingDoc = snapshot.docs[0];
        const existingData = existingDoc.data() as FeeCollectionRecord;
        
        // Merge payments
        const mergedPayments = [...existingData.payments];
        payments.forEach(newPayment => {
          const existingPaymentIndex = mergedPayments.findIndex(p => p.categoryId === newPayment.categoryId);
          if (existingPaymentIndex >= 0) {
            mergedPayments[existingPaymentIndex].amount += newPayment.amount;
          } else {
            mergedPayments.push(newPayment);
          }
        });
        
        const newTotal = existingData.totalAmount + totalAmount;
        
        await updateDoc(doc(db, 'feeCollections', existingDoc.id), {
          payments: mergedPayments,
          totalAmount: newTotal,
          updatedAt: serverTimestamp(),
          collectedBy
        });
        if (!isBulk) toast.success('ফি আপডেট করা হয়েছে!');
      } else {
        // Create new record
        await addDoc(collection(db, 'feeCollections'), {
          orgId,
          studentId,
          classId: targetClassId,
          hijriYear: year,
          hijriMonth: month,
          payments,
          totalAmount,
          datePaid: serverTimestamp(),
          collectedBy
        });
        if (!isBulk) toast.success('ফি আদায় সফলভাবে সংরক্ষিত হয়েছে!');
      }
    } catch (error) {
      console.error("Error adding fee collection:", error);
      if (!isBulk) toast.error('ফি আদায় সংরক্ষণ করতে ব্যর্থ হয়েছে।');
      throw error;
    }
  };

  const deleteCollection = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'feeCollections', id));
      toast.success('ফি রেকর্ড মুছে ফেলা হয়েছে!');
    } catch (error) {
      console.error("Error deleting fee collection:", error);
      toast.error('ফি রেকর্ড মুছতে ব্যর্থ হয়েছে।');
      throw error;
    }
  };

  const bulkAddCollection = async (
    studentIds: string[],
    targetClassId: string,
    year: number,
    month: number,
    payments: FeePayment[],
    totalAmount: number,
    collectedBy: string
  ) => {
    if (!orgId || studentIds.length === 0) return;
    try {
      // For bulk, we'll process them sequentially to handle existing records properly.
      // In a real large-scale app, we might use batching, but for typical class sizes (30-50),
      // sequential or Promise.all is acceptable and easier to manage with the existing logic.
      
      const promises = studentIds.map(studentId => 
        addCollection(studentId, targetClassId, year, month, payments, totalAmount, collectedBy, true)
      );
      
      await Promise.all(promises);
      toast.success(`${studentIds.length} জন শিক্ষার্থীর ফি সফলভাবে সংরক্ষিত হয়েছে!`);
    } catch (error) {
      console.error("Error in bulk fee collection:", error);
      toast.error('একাধিক শিক্ষার্থীর ফি সংরক্ষণ করতে সমস্যা হয়েছে।');
      throw error;
    }
  };

  return { collections, loading, addCollection, bulkAddCollection, deleteCollection };
};
