import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
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
  deleteField,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import toast from "react-hot-toast";

interface AuthContextType {
  user: User | null;
  orgId: string | null;
  orgName: string | null;
  role: string | null;
  visitedOrgs: { [key: string]: string };
  loading: boolean;
  setLoading: (loading: boolean) => void;
  createOrganization: (name: string) => Promise<string | null>;
  joinOrganization: (identifier: string) => Promise<string | null>;
  leaveOrganization: () => Promise<void>;
  removeVisitedOrg: (orgId: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(auth?.currentUser || null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [visitedOrgs, setVisitedOrgs] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    
    let unsubUser: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // Clean up previous user listener if it exists
      if (unsubUser) {
        unsubUser();
        unsubUser = null;
      }

      setUser(currentUser);
      
      if (currentUser && db) {
        setLoading(true);
        const userDocRef = doc(db, `users`, currentUser.uid);
        
        // Ensure user's basic info is stored without blocking
        try {
          const fallbackName = currentUser.email ? currentUser.email.split('@')[0] : "ব্যবহারকারী";
          setDoc(userDocRef, {
            displayName: currentUser.displayName || fallbackName,
            email: currentUser.email || "",
            photoURL: currentUser.photoURL || "",
            lastSeen: serverTimestamp()
          }, { merge: true }).catch(e => console.error("Error saving user info:", e));
        } catch (e) {
          console.error("Error saving user info:", e);
        }

        unsubUser = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const currentOrgId = data.organizationId || null;
            let userRole = (currentOrgId && data.roles && data.roles[currentOrgId]) || data.role || "teacher"; // Default role
            const history = data.visitedOrgs || {};

            // Set initial state
            setRole(userRole);
            setVisitedOrgs(history);
            
            let currentOrgName = currentOrgId ? (history[currentOrgId] || null) : null;
            setOrgName(currentOrgName);
            setOrgId(currentOrgId);
            
            // Perform background checks
            if (currentOrgId && userRole !== "admin") {
              try {
                const orgRef = doc(db, "organizations", currentOrgId);
                const orgSnap = await getDoc(orgRef);
                if (orgSnap.exists() && orgSnap.data().createdBy === currentUser.uid) {
                  userRole = "admin";
                  setRole(userRole);
                  setDoc(userDocRef, { roles: { [currentOrgId]: "admin" } }, { merge: true }).catch(console.error);
                }
              } catch (e) {
                console.error("Error checking org owner:", e);
              }
            }

            if (currentOrgId && !currentOrgName) {
              try {
                const orgRef = doc(db, "organizations", currentOrgId);
                const orgSnap = await getDoc(orgRef);
                if (orgSnap.exists()) {
                  const fetchedOrgName = orgSnap.data().name;
                  setOrgName(fetchedOrgName);
                  setVisitedOrgs(prev => ({ ...prev, [currentOrgId]: fetchedOrgName }));
                  setDoc(
                    userDocRef,
                    {
                      visitedOrgs: { [currentOrgId]: fetchedOrgName },
                    },
                    { merge: true },
                  ).catch(console.error);
                }
              } catch (e) {
                console.error("Error auto-populating history:", e);
              }
            }
            
            // Only set loading to false after we have attempted to load org data
            setLoading(false);
          } else {
            setOrgId(null);
            setOrgName(null);
            setVisitedOrgs({});
            setLoading(false);
          }
        });
      } else {
        setOrgId(null);
        setOrgName(null);
        setVisitedOrgs({});
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubUser) unsubUser();
    };
  }, []);

  const createOrganization = useCallback(
    async (name: string): Promise<string | null> => {
      if (!user || !db) return null;
      try {
        const newOrgId = `org-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        await setDoc(doc(db, "organizations", newOrgId), {
          id: newOrgId,
          name,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
        });

        const fallbackName = user.email ? user.email.split('@')[0] : "ব্যবহারকারী";
        await setDoc(
          doc(db, "users", user.uid),
          {
            displayName: user.displayName || fallbackName,
            email: user.email || "",
            photoURL: user.photoURL || "",
            organizationId: newOrgId,
            visitedOrgs: {
              [newOrgId]: name,
            },
            roles: {
              [newOrgId]: "admin",
            },
            lastSeen: serverTimestamp()
          },
          { merge: true },
        );

        setOrgId(newOrgId);
        toast.success("প্রতিষ্ঠান সফলভাবে তৈরি হয়েছে!");
        return newOrgId;
      } catch (error) {
        console.error("Error creating organization:", error);
        toast.error("প্রতিষ্ঠান তৈরি করতে ব্যর্থ হয়েছে।");
        return null;
      }
    },
    [user],
  );

  const joinOrganization = useCallback(
    async (identifier: string): Promise<string | null> => {
      if (!user || !db) return null;
      const cleanIdentifier = identifier.trim();
      try {
        let targetOrgId = cleanIdentifier;
        let orgName = "";

        const orgRef = doc(db, "organizations", cleanIdentifier);
        const orgSnap = await getDoc(orgRef);

        if (orgSnap.exists()) {
          orgName = orgSnap.data().name;
        } else {
          const q = query(
            collection(db, "organizations"),
            where("name", "==", cleanIdentifier),
          );
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const orgDoc = querySnapshot.docs[0];
            targetOrgId = orgDoc.id;
            orgName = orgDoc.data().name;
          } else {
            throw new Error(
              "প্রতিষ্ঠান খুঁজে পাওয়া যায়নি। অনুগ্রহ করে সঠিক নাম বা আইডি প্রদান করুন।",
            );
          }
        }

        const fallbackName = user.email ? user.email.split('@')[0] : "ব্যবহারকারী";
        await setDoc(
          doc(db, "users", user.uid),
          {
            displayName: user.displayName || fallbackName,
            email: user.email || "",
            photoURL: user.photoURL || "",
            organizationId: targetOrgId,
            visitedOrgs: {
              [targetOrgId]: orgName,
            },
            lastSeen: serverTimestamp()
          },
          { merge: true },
        );

        setOrgId(targetOrgId);
        toast.success("প্রতিষ্ঠানে সফলভাবে যুক্ত হয়েছেন!");
        return targetOrgId;
      } catch (error: any) {
        console.error("Error joining organization:", error);
        toast.error(error.message || "প্রতিষ্ঠানে যুক্ত হতে ব্যর্থ হয়েছে।");
        return null;
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

  const removeVisitedOrg = useCallback(async (orgIdToRemove: string) => {
    if (!user || !db) return;
    try {
      const updates: any = {
        [`visitedOrgs.${orgIdToRemove}`]: deleteField(),
      };
      
      if (orgId === orgIdToRemove) {
        updates.organizationId = null;
      }

      await updateDoc(doc(db, "users", user.uid), updates);
      
      setVisitedOrgs((prev) => {
        const updated = { ...prev };
        delete updated[orgIdToRemove];
        return updated;
      });
      
      if (orgId === orgIdToRemove) {
        setOrgId(null);
      }
      
      toast.success("তালিকা থেকে মুছে ফেলা হয়েছে।");
    } catch (error) {
      console.error("Error removing visited org:", error);
      toast.error("মুছে ফেলতে ব্যর্থ হয়েছে।");
    }
  }, [user, orgId]);

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

  return (
    <AuthContext.Provider
      value={{
        user,
        orgId,
        orgName,
        role,
        visitedOrgs,
        loading,
        setLoading,
        createOrganization,
        joinOrganization,
        leaveOrganization,
        removeVisitedOrg,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
