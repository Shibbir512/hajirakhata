import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import { getFirestore, Firestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAnalytics, Analytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCPApAnSzRk-pZT5y36N1mKPdpGthoPORs",
  authDomain: "myattendanceapp-41a5d.firebaseapp.com",
  projectId: "myattendanceapp-41a5d",
  storageBucket: "myattendanceapp-41a5d.firebasestorage.app",
  messagingSenderId: "988935534386",
  appId: "1:988935534386:web:c60f533e0d3b201132492b",
  measurementId: "G-8RZ307N1LF"
};

let auth: Auth | null = null;
let db: Firestore | null = null;
let googleProvider: GoogleAuthProvider | null = null;
let analytics: Analytics | null = null;

try {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  
  // Initialize Firestore with persistent cache
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });

  googleProvider = new GoogleAuthProvider();
  analytics = getAnalytics(app);
} catch (error) {
  console.error("Firebase initialization failed:", error);
}

export { auth, db, googleProvider, analytics };
