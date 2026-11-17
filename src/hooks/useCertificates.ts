import { useState, useEffect, useCallback } from "react";
import { db, handleFirestoreError, OperationType } from "../firebase";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import { CertificatePadSettings, CertificateRecord } from "../types";
import toast from "react-hot-toast";

export const useCertificates = (orgId: string | null, user: any) => {
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [padSettings, setPadSettings] = useState<CertificatePadSettings>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !db || !orgId) {
      setCertificates([]);
      setPadSettings({});
      setLoading(false);
      return;
    }

    setLoading(true);
    const certsRef = collection(db, `organizations/${orgId}/certificates`);
    const unsubCerts = onSnapshot(
      certsRef,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({
          ...(d.data() as CertificateRecord),
          id: d.id,
        }));
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setCertificates(list);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching certificates:", error);
        setLoading(false);
      }
    );

    // Fetch organization pad settings
    const fetchPad = async () => {
      try {
        const orgSnap = await getDoc(doc(db, "organizations", orgId));
        if (orgSnap.exists()) {
          const data = orgSnap.data();
          const saved = data.certificatePadSettings || {};
          setPadSettings({
            orgNameBn: saved.orgNameBn || data.name || "",
            address: saved.address || data.address || "",
            phone: saved.phone || data.phone || "",
            email: saved.email || data.email || "",
            established: saved.established || "",
            eiinOrCode: saved.eiinOrCode || data.orgCode || "",
            logoUrl: saved.logoUrl || "/icon.png",
            principalTitle: saved.principalTitle || "মুহতামিম / অধ্যক্ষ",
            principalName: saved.principalName || "",
            showBismillah: saved.showBismillah ?? true,
            showWatermark: saved.showWatermark ?? true,
            showQrCode: saved.showQrCode ?? true,
          });
        }
      } catch (e) {
        console.error("Error loading org pad settings:", e);
      }
    };

    fetchPad();

    return () => unsubCerts();
  }, [user, orgId]);

  const issueCertificate = useCallback(
    async (
      payload: Omit<CertificateRecord, "id" | "orgId" | "createdAt" | "issuedBy"> & {
        id?: string;
      }
    ): Promise<CertificateRecord | null> => {
      if (!user || !db || !orgId) {
        toast.error("প্রতিষ্ঠান বা ব্যবহারকারীর তথ্য পাওয়া যায়নি।");
        return null;
      }

      try {
        const isUpdate = Boolean(payload.id);
        const certId = payload.id || `cert-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const certRef = doc(db, `organizations/${orgId}/certificates`, certId);

        const cleanData: any = {
          ...payload,
          id: certId,
          orgId,
          issuedBy: {
            uid: user.uid,
            name: user.displayName || user.email?.split("@")[0] || "শিক্ষক",
            email: user.email || "",
          },
          createdAt: isUpdate ? (payload as any).createdAt || Date.now() : Date.now(),
          updatedAt: Date.now(),
        };

        // Strip undefined fields for Firestore compatibility
        Object.keys(cleanData).forEach((key) => {
          if (cleanData[key] === undefined) {
            delete cleanData[key];
          }
        });
        if (cleanData.padSettings) {
          Object.keys(cleanData.padSettings).forEach((key) => {
            if (cleanData.padSettings[key] === undefined) {
              delete cleanData.padSettings[key];
            }
          });
        }

        await setDoc(certRef, cleanData, { merge: true });
        toast.success(
          isUpdate
            ? "সনদপত্র সফলভাবে আপডেট করা হয়েছে!"
            : "সনদপত্র সফলভাবে সংরক্ষণ করা হয়েছে!"
        );
        return cleanData as CertificateRecord;
      } catch (error) {
        console.error("Error saving certificate:", error);
        try {
          handleFirestoreError(
            error,
            OperationType.WRITE,
            `organizations/${orgId}/certificates`
          );
        } catch {
          // Handled cleanly via toast below
        }
        toast.error("সনদপত্র সংরক্ষণ করতে ব্যর্থ হয়েছে।");
        return null;
      }
    },
    [user, orgId]
  );

  const deleteCertificate = useCallback(
    async (certId: string): Promise<boolean> => {
      if (!user || !db || !orgId) return false;
      try {
        await deleteDoc(doc(db, `organizations/${orgId}/certificates`, certId));
        toast.success("সনদপত্র রেকর্ড মুছে ফেলা হয়েছে।");
        return true;
      } catch (error) {
        console.error("Error deleting certificate:", error);
        toast.error("সনদপত্র মুছতে ব্যর্থ হয়েছে (অ্যাডমিন অনুমোদন প্রয়োজন)।");
        return false;
      }
    },
    [user, orgId]
  );

  const savePadSettings = useCallback(
    async (settings: CertificatePadSettings): Promise<boolean> => {
      if (!user || !db || !orgId) return false;
      try {
        const cleanSettings = Object.fromEntries(
          Object.entries(settings).filter(([_, v]) => v !== undefined)
        );
        await updateDoc(doc(db, "organizations", orgId), {
          certificatePadSettings: cleanSettings,
        });
        setPadSettings(cleanSettings as CertificatePadSettings);
        toast.success("প্রতিষ্ঠানের প্যাড সেটিংস সংরক্ষিত হয়েছে!");
        return true;
      } catch (error) {
        console.error("Error saving pad settings:", error);
        toast.error("প্যাড সেটিংস সংরক্ষণ করতে অ্যাডমিন অনুমতি প্রয়োজন।");
        return false;
      }
    },
    [user, orgId]
  );

  return {
    certificates,
    padSettings,
    loading,
    issueCertificate,
    deleteCertificate,
    savePadSettings,
  };
};
