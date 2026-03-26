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
import { generateMadrasaId } from "../utils/idGenerator";

interface AuthContextType {
  user: User | null;
  orgId: string | null;
  orgName: string | null;
  role: string | null;
  status: string | null;
  phone: string | null;
  photoURL: string | null;
  visitedOrgs: { [key: string]: string };
  isApprovalEnabled: boolean;
  notificationPreferences: {
    signupRequests: boolean;
    joinRequests: boolean;
  };
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
  const [status, setStatus] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [visitedOrgs, setVisitedOrgs] = useState<{ [key: string]: string }>({});
  const [isApprovalEnabled, setIsApprovalEnabled] = useState(true);
  const [notificationPreferences, setNotificationPreferences] = useState({
    signupRequests: true,
    joinRequests: true
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !db) return;
    
    try {
      const configRef = doc(db, "globalSettings", "config");
      const unsubscribe = onSnapshot(configRef, (docSnap) => {
        if (docSnap.exists()) {
          setIsApprovalEnabled(docSnap.data().isApprovalEnabled ?? true);
        }
      }, (error) => {
        // Silently handle permission errors to avoid annoying the user
        // This usually happens if Firebase Rules are not deployed correctly
        setIsApprovalEnabled(true);
      });
      
      return () => unsubscribe();
    } catch (err) {
      // Ignore errors
    }
  }, [user]);

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
          const docSnap = await getDoc(userDocRef);
          const existingData = docSnap.exists() ? docSnap.data() : null;

          const updateData: any = {
            displayName: currentUser.displayName || fallbackName,
            email: currentUser.email || "",
            lastSeen: serverTimestamp()
          };

          // Only sync photoURL from Google if Firestore doesn't have one yet
          if (!existingData?.photoURL && currentUser.photoURL) {
            updateData.photoURL = currentUser.photoURL;
          }

          if (!docSnap.exists()) {
            const configSnap = await getDoc(doc(db, "globalSettings", "config"));
            const approvalEnabled = configSnap.exists() ? (configSnap.data().isApprovalEnabled ?? true) : true;
            updateData.status = approvalEnabled ? "pending" : "active";
            setDoc(userDocRef, updateData).catch(console.error);
          } else {
            updateDoc(userDocRef, updateData).catch(console.error);
          }
        } catch (e) {
          console.error("Error saving user info:", e);
        }

        unsubUser = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const currentOrgId = data.organizationId || null;
            const isSuperAdmin = currentUser.email === "shibbir.ahma.2025@gmail.com";
            let userRole = isSuperAdmin ? "admin" : ((currentOrgId && data.roles && data.roles[currentOrgId]) || data.role || "teacher"); // Default role
            const history = data.visitedOrgs || {};
            const userPhone = data.phone || null;
            const userStatus = data.status || "active";
            const userPhotoURL = data.photoURL || null;
            const userNotificationPreferences = data.notificationPreferences || {
              signupRequests: true,
              joinRequests: true
            };

            // Set initial state
            setRole(userRole);
            setStatus(userStatus);
            setVisitedOrgs(history);
            setPhone(userPhone);
            setPhotoURL(userPhotoURL);
            setNotificationPreferences(userNotificationPreferences);
            
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
                  updateDoc(userDocRef, { [`roles.${currentOrgId}`]: "admin" }).catch(console.error);
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
                  updateDoc(
                    userDocRef,
                    {
                      [`visitedOrgs.${currentOrgId}`]: fetchedOrgName,
                    }
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
        }, (error) => {
          console.error("Error in userDoc snapshot listener:", error);
          setLoading(false);
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
        const trimmedName = name.trim();
        const newOrgId = `org-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        // Try to get the most up-to-date info from the users collection first
        let cName = user.displayName || user.email?.split('@')[0] || "অজানা";
        let cEmail = user.email || "ইমেইল নেই";
        
        try {
          const userSnap = await getDoc(doc(db, "users", user.uid));
          if (userSnap.exists()) {
            const userData = userSnap.data();
            cName = userData.displayName || cName;
            cEmail = userData.email || cEmail;
          }
        } catch (e) {
          console.error("Error fetching user data for org creation:", e);
        }

        const promise = (async () => {
          const madrasaId = await generateMadrasaId();
          const orgCode = madrasaId.toString();
          await setDoc(doc(db, "organizations", newOrgId), {
            id: newOrgId,
            orgCode: orgCode,
            name: trimmedName,
            nameLowercase: trimmedName.toLowerCase(),
            createdBy: user.uid,
            creatorName: cName,
            creatorEmail: cEmail,
            createdAt: serverTimestamp(),
          });

          const fallbackName = user.email ? user.email.split('@')[0] : "ব্যবহারকারী";
          await updateDoc(
            doc(db, "users", user.uid),
            {
              displayName: user.displayName || fallbackName,
              email: user.email || "",
              photoURL: user.photoURL || "",
              organizationId: newOrgId,
              [`visitedOrgs.${newOrgId}`]: trimmedName,
              [`roles.${newOrgId}`]: "admin",
              lastSeen: serverTimestamp()
            }
          );
        })();

        await toast.promise(promise, {
          loading: 'প্রতিষ্ঠান তৈরি করা হচ্ছে...',
          success: 'প্রতিষ্ঠান সফলভাবে তৈরি হয়েছে!',
          error: 'প্রতিষ্ঠান তৈরি করতে ব্যর্থ হয়েছে।',
        });

        setOrgId(newOrgId);
        return newOrgId;
      } catch (error) {
        console.error("Error creating organization:", error);
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
          const lowerIdentifier = cleanIdentifier.toLowerCase();
          
          // First try searching by orgCode
          const qOrgCode = query(
            collection(db, "organizations"),
            where("orgCode", "==", cleanIdentifier),
          );
          const querySnapshotOrgCode = await getDocs(qOrgCode);

          if (!querySnapshotOrgCode.empty) {
            const orgDoc = querySnapshotOrgCode.docs[0];
            targetOrgId = orgDoc.id;
            orgName = orgDoc.data().name;
          } else {
            // Then try searching by nameLowercase for case-insensitive match
            const qLower = query(
              collection(db, "organizations"),
              where("nameLowercase", "==", lowerIdentifier),
            );
            const querySnapshotLower = await getDocs(qLower);

            if (!querySnapshotLower.empty) {
              const orgDoc = querySnapshotLower.docs[0];
              targetOrgId = orgDoc.id;
              orgName = orgDoc.data().name;
            } else {
              // Fallback for existing organizations that don't have nameLowercase yet
              const qOriginal = query(
                collection(db, "organizations"),
                where("name", "==", cleanIdentifier),
              );
              const querySnapshotOriginal = await getDocs(qOriginal);

              if (!querySnapshotOriginal.empty) {
                const orgDoc = querySnapshotOriginal.docs[0];
                targetOrgId = orgDoc.id;
                orgName = orgDoc.data().name;
              } else {
                // Last attempt: try to find by prefix in nameLowercase
                const qPrefix = query(
                  collection(db, "organizations"),
                  where("nameLowercase", ">=", lowerIdentifier),
                  where("nameLowercase", "<=", lowerIdentifier + "\uf8ff"),
                );
                const querySnapshotPrefix = await getDocs(qPrefix);
                
                if (!querySnapshotPrefix.empty) {
                  const orgDoc = querySnapshotPrefix.docs[0];
                  targetOrgId = orgDoc.id;
                  orgName = orgDoc.data().name;
                  toast.success(`"${orgName}" প্রতিষ্ঠানটি খুঁজে পাওয়া গেছে।`);
                } else {
                  // Ultimate Fallback: Client-side search for Bengali normalization issues
                  const allOrgsSnapshot = await getDocs(collection(db, "organizations"));
                  
                  const normalizeBengali = (text: string) => {
                    if (!text) return "";
                    return text
                      .replace(/ড়/g, "ড়")
                      .replace(/ঢ়/g, "ঢ়")
                      .replace(/য়/g, "য়")
                      .replace(/\u200D/g, "") // Remove Zero Width Joiner
                      .replace(/\u200C/g, "") // Remove Zero Width Non-Joiner
                      .trim()
                      .toLowerCase();
                  };

                  const normalizedSearch = normalizeBengali(cleanIdentifier);
                  let foundOrg = null;

                  for (const doc of allOrgsSnapshot.docs) {
                    const data = doc.data();
                    if (data.name && normalizeBengali(data.name) === normalizedSearch) {
                      foundOrg = { id: doc.id, name: data.name };
                      break;
                    }
                  }

                  if (foundOrg) {
                    targetOrgId = foundOrg.id;
                    orgName = foundOrg.name;
                    toast.success(`"${orgName}" প্রতিষ্ঠানটি খুঁজে পাওয়া গেছে।`);
                  } else {
                    throw new Error(
                      `প্রতিষ্ঠান "${cleanIdentifier}" খুঁজে পাওয়া যায়নি। অনুগ্রহ করে সঠিক নাম বা আইডি প্রদান করুন।`,
                    );
                  }
                }
              }
            }
          }
        }

        const fallbackName = user.email ? user.email.split('@')[0] : "ব্যবহারকারী";
        
        // Check if user already has a role in this org
        const userDocRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userDocRef);
        let existingRole = null;
        if (userSnap.exists()) {
          const userData = userSnap.data();
          existingRole = userData.roles && userData.roles[targetOrgId];
        }

        const promise = (async () => {
          const updates: any = {
            displayName: user.displayName || fallbackName,
            email: user.email || "",
            photoURL: user.photoURL || "",
            organizationId: targetOrgId,
            [`visitedOrgs.${targetOrgId}`]: orgName,
            lastSeen: serverTimestamp()
          };

          if (!existingRole) {
            updates[`roles.${targetOrgId}`] = "pending";
          }

          await updateDoc(userDocRef, updates);
        })();

        await toast.promise(promise, {
          loading: 'প্রতিষ্ঠানে যুক্ত করা হচ্ছে...',
          success: 'প্রতিষ্ঠানে সফলভাবে যুক্ত হয়েছেন!',
          error: (err: any) => err.message || "প্রতিষ্ঠানে যুক্ত হতে ব্যর্থ হয়েছে।",
        });

        setOrgId(targetOrgId);
        return targetOrgId;
      } catch (error: any) {
        console.error("Error joining organization:", error);
        return null;
      }
    },
    [user],
  );

  const leaveOrganization = useCallback(async () => {
    if (!user || !db) return;
    try {
      const promise = updateDoc(
        doc(db, "users", user.uid),
        { organizationId: null }
      );
      
      await toast.promise(promise, {
        loading: 'প্রতিষ্ঠান থেকে প্রস্থান করা হচ্ছে...',
        success: 'প্রতিষ্ঠান থেকে সফলভাবে প্রস্থান করেছেন।',
        error: 'প্রতিষ্ঠান থেকে প্রস্থান করতে ব্যর্থ হয়েছে।',
      });
      
      setOrgId(null);
    } catch (error) {
      console.error("Error leaving organization:", error);
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
        status,
        phone,
        photoURL,
        visitedOrgs,
        isApprovalEnabled,
        notificationPreferences,
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
