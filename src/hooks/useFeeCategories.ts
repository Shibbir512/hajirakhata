import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';

export interface FeeCategory {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  createdAt: any;
}

export const useFeeCategories = (orgId: string | undefined) => {
  const [categories, setCategories] = useState<FeeCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) {
      setCategories([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'feeCategories'), where('orgId', '==', orgId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cats: FeeCategory[] = [];
      snapshot.forEach((doc) => {
        cats.push({ id: doc.id, ...doc.data() } as FeeCategory);
      });
      // Sort by name or creation date
      cats.sort((a, b) => a.name.localeCompare(b.name));
      setCategories(cats);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching fee categories:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orgId]);

  const addCategory = async (name: string, description: string = '') => {
    if (!orgId) return;
    try {
      await addDoc(collection(db, 'feeCategories'), {
        orgId,
        name,
        description,
        createdAt: serverTimestamp()
      });
      toast.success('ফি খাত সফলভাবে যোগ করা হয়েছে!');
    } catch (error) {
      console.error("Error adding category:", error);
      toast.error('ফি খাত যোগ করতে ব্যর্থ হয়েছে।');
      throw error;
    }
  };

  const updateCategory = async (id: string, name: string, description: string = '') => {
    try {
      await updateDoc(doc(db, 'feeCategories', id), {
        name,
        description
      });
      toast.success('ফি খাত আপডেট করা হয়েছে!');
    } catch (error) {
      console.error("Error updating category:", error);
      toast.error('ফি খাত আপডেট করতে ব্যর্থ হয়েছে।');
      throw error;
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'feeCategories', id));
      toast.success('ফি খাত মুছে ফেলা হয়েছে!');
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error('ফি খাত মুছতে ব্যর্থ হয়েছে।');
      throw error;
    }
  };

  return { categories, loading, addCategory, updateCategory, deleteCategory };
};
