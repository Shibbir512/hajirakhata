import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, Firestore, getDocFromServer, doc } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getMessaging, Messaging } from 'firebase/messaging';
import firebaseConfig from '../firebase-applet-config.json';

let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let messaging: Messaging | null = null;
let googleProvider: GoogleAuthProvider | null = null;

export { firebaseConfig };

try {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  
  // Initialize Firestore with correct database ID and built-in offline persistence
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  }, (firebaseConfig as any).firestoreDatabaseId);

  storage = getStorage(app);
  googleProvider = new GoogleAuthProvider();
  
  // Initialize Messaging only if supported in the browser
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    messaging = getMessaging(app);
  }

  // Connection test
  const testConnection = async () => {
    if (!db) return;
    try {
      // Attempt to fetch a non-existent doc from server to test connectivity
      await getDocFromServer(doc(db, '_connection_test_', 'ping'));
      console.log("Firestore connection successful");
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('the client is offline') || (error as any).code === 'unavailable') {
          console.error("Firestore is offline or unavailable. Please check your Firebase configuration or internet connection.");
          // We don't throw here to avoid crashing the whole app during init, 
          // but we log it for the AIS Agent to see.
          const errInfo = {
            error: error.message,
            code: (error as any).code,
            operation: 'connection_test'
          };
          console.error('FIRESTORE_CONNECTIVITY_ERROR:', JSON.stringify(errInfo));
        }
      }
    }
  };
  testConnection();

} catch (error) {
  console.error("Firebase initialization failed:", error);
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export { auth, db, storage, messaging, googleProvider };
