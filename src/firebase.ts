import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import { getFirestore, Firestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let googleProvider: GoogleAuthProvider | null = null;

try {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  
  // Initialize Firestore with correct database ID
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

  // Enable offline persistence
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        console.warn('Persistence failed: Multiple tabs open');
    } else if (err.code == 'unimplemented') {
        console.warn('Persistence failed: Browser not supported');
    }
  });

  storage = getStorage(app);

  googleProvider = new GoogleAuthProvider();
} catch (error) {
  console.error("Firebase initialization failed:", error);
}

export { auth, db, storage, googleProvider };
