import { useState, useEffect, useCallback } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import {
  doc,
  onSnapshot,
  setDoc,
  getDoc,
  query,
  collection,
  where,
  getDocs,
} from "firebase/firestore";
import toast from "react-hot-toast";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(auth?.currentUser || null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [visitedOrgs, setVisitedOrgs] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setLoading(true);
        const userDocRef = doc(db!, `users`, currentUser.uid);
        const unsubUser = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const currentOrgId = data.organizationId || null;
            const history = data.visitedOrgs || {};

            setOrgId(currentOrgId);
            setVisitedOrgs(history);

            if (currentOrgId && !history[currentOrgId]) {
              try {
                const orgRef = doc(db!, "organizations", currentOrgId);
                const orgSnap = await getDoc(orgRef);
                if (orgSnap.exists()) {
                  const orgName = orgSnap.data().name;
                  await setDoc(
                    userDocRef,
                    {
                      visitedOrgs: { [currentOrgId]: orgName },
                    },
                    { merge: true },
                  );
                }
              } catch (e) {
                console.error("Error auto-populating history:", e);
              }
            }

            setLoading(false);
          } else {
            setOrgId(null);
            setVisitedOrgs({});
            setLoading(false);
          }
        });
        return () => unsubUser();
      } else {
        setOrgId(null);
        setVisitedOrgs({});
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const createOrganization = useCallback(
    async (name: string) => {
      if (!user || !db) return;
      try {
        const newOrgId = `org-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        await setDoc(doc(db, "organizations", newOrgId), {
          id: newOrgId,
          name,
          createdBy: user.uid,
          createdAt: Date.now(),
        });

        await setDoc(
          doc(db, "users", user.uid),
          {
            organizationId: newOrgId,
            visitedOrgs: {
              [newOrgId]: name,
            },
          },
          { merge: true },
        );

        setOrgId(newOrgId);
        toast.success("প্রতিষ্ঠান সফলভাবে তৈরি হয়েছে!");
      } catch (error) {
        console.error("Error creating organization:", error);
        toast.error("প্রতিষ্ঠান তৈরি করতে ব্যর্থ হয়েছে।");
      }
    },
    [user],
  );

  const joinOrganization = useCallback(
    async (identifier: string) => {
      if (!user || !db) return;
      try {
        let targetOrgId = identifier;
        let orgName = "";

        const orgRef = doc(db, "organizations", identifier);
        const orgSnap = await getDoc(orgRef);

        if (orgSnap.exists()) {
          orgName = orgSnap.data().name;
        } else {
          const q = query(
            collection(db, "organizations"),
            where("name", "==", identifier),
          );
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const orgDoc = querySnapshot.docs[0];
            targetOrgId = orgDoc.id;
            orgName = orgDoc.data().name;
          } else {
            throw new Error(
              "Organization not found. Please provide a valid name or ID.",
            );
          }
        }

        await setDoc(
          doc(db, "users", user.uid),
          {
            organizationId: targetOrgId,
            visitedOrgs: {
              [targetOrgId]: orgName,
            },
          },
          { merge: true },
        );

        setOrgId(targetOrgId);
        toast.success("প্রতিষ্ঠানে সফলভাবে যুক্ত হয়েছেন!");
      } catch (error: any) {
        console.error("Error joining organization:", error);
        toast.error(error.message || "প্রতিষ্ঠানে যুক্ত হতে ব্যর্থ হয়েছে।");
      }
    },
    [user],
  );

  const leaveOrganization = useCallback(async () => {
    if (!user || !db) return;
    try {
      await setDoc(
        doc(db, "users", user.uid),
        { organizationId: null },
        { merge: true },
      );
      setOrgId(null);
      toast.success("প্রতিষ্ঠান থেকে সফলভাবে প্রস্থান করেছেন।");
    } catch (error) {
      console.error("Error leaving organization:", error);
      toast.error("প্রতিষ্ঠান থেকে প্রস্থান করতে ব্যর্থ হয়েছে।");
    }
  }, [user]);

  const logout = useCallback(async () => {
    if (auth) {
      try {
        await signOut(auth);
        toast.success("সফলভাবে লগআউট হয়েছে।");
      } catch (error) {
        console.error("Error logging out:", error);
        toast.error("লগআউট করতে ব্যর্থ হয়েছে।");
      }
    }
  }, []);

  return {
    user,
    orgId,
    visitedOrgs,
    loading,
    setLoading,
    createOrganization,
    joinOrganization,
    leaveOrganization,
    logout,
  };
};
