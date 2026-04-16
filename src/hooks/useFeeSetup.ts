import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';

export interface FeeSetup {
  id: string;
  orgId: string;
  classId: string;
  categoryId: string;
  amount: number;
  updatedAt: any;
}

export const useFeeSetup = (orgId: string | undefined, classId?: string) => {
  const [feeSetups, setFeeSetups] = useState<FeeSetup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) {
      setFeeSetups([]);
      setLoading(false);
      return;
    }

    let q = query(collection(db, 'feeSetups'), where('orgId', '==', orgId));
    if (classId) {
      q = query(collection(db, 'feeSetups'), where('orgId', '==', orgId), where('classId', '==', classId));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const setups: FeeSetup[] = [];
      snapshot.forEach((doc) => {
        setups.push({ id: doc.id, ...doc.data() } as FeeSetup);
      });
      setFeeSetups(setups);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching fee setups:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orgId, classId]);

  // Save multiple setups for a class at once
  const saveClassFeeSetup = async (targetClassId: string, setups: { categoryId: string, amount: number }[]) => {
    if (!orgId) return;
    
    try {
      const batch = writeBatch(db);
      
      setups.forEach(setup => {
        // Create a predictable document ID: orgId_classId_categoryId
        const docId = `${orgId}_${targetClassId}_${setup.categoryId}`;
        const setupRef = doc(db, 'feeSetups', docId);
        
        batch.set(setupRef, {
          orgId,
          classId: targetClassId,
          categoryId: setup.categoryId,
          amount: setup.amount,
          updatedAt: serverTimestamp()
        }, { merge: true });
      });

      await batch.commit();
      toast.success('ফি সেটআপ সংরক্ষণ করা হয়েছে!');
    } catch (error) {
      console.error("Error saving fee setup:", error);
      toast.error('ফি সেটআপ সংরক্ষণ করতে ব্যর্থ হয়েছে।');
      throw error;
    }
  };

  return { feeSetups, loading, saveClassFeeSetup };
};
