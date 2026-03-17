import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import { getFirestore, Firestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAnalytics, Analytics } from "firebase/analytics";
import firebaseConfig from '../firebase-applet-config.json';

let auth: Auth | null = null;
let db: Firestore | null = null;
let googleProvider: GoogleAuthProvider | null = null;
let analytics: Analytics | null = null;

try {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  
  // Initialize Firestore with persistent cache and correct database ID
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  }, firebaseConfig.firestoreDatabaseId);

  googleProvider = new GoogleAuthProvider();
  analytics = getAnalytics(app);
} catch (error) {
  console.error("Firebase initialization failed:", error);
}

export { auth, db, googleProvider, analytics };
