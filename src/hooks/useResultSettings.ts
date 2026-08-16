import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';

export const useResultSettings = (orgId: string | null | undefined) => {
  const [gradingSystem, setGradingSystem] = useState<'madrasa' | 'general'>('madrasa');
  const [defaultPassMark, setDefaultPassMark] = useState<number>(33);
  const [strictFailing, setStrictFailing] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, "organizations", orgId));
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.gradingSystem) setGradingSystem(data.gradingSystem);
          if (data.defaultPassMark !== undefined) setDefaultPassMark(data.defaultPassMark);
          if (data.strictFailing !== undefined) setStrictFailing(data.strictFailing);
        }
      } catch (error) {
        console.error("Error fetching result settings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [orgId]);

  const updateSetting = async (key: string, value: any) => {
    if (!orgId) return;
    try {
      if (key === 'gradingSystem') setGradingSystem(value);
      if (key === 'defaultPassMark') setDefaultPassMark(value);
      if (key === 'strictFailing') setStrictFailing(value);
      
      const orgRef = doc(db, "organizations", orgId);
      await updateDoc(orgRef, { [key]: value });
      toast.success("ফলাফল সেটিংস আপডেট করা হয়েছে!");
    } catch (error) {
      console.error("Error updating result setting:", error);
      toast.error("সেটিংস আপডেট করতে ব্যর্থ হয়েছে।");
    }
  };

  return { gradingSystem, defaultPassMark, strictFailing, loading, updateSetting };
};
