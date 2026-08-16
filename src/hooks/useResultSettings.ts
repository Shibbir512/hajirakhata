import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

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

  return { gradingSystem, defaultPassMark, strictFailing, loading };
};
