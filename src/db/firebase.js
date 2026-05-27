import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut 
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where 
} from "firebase/firestore";
import { getAllRecords, bulkAddRecords, clearAllRecords } from './indexedDB';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();

// Whitelist of authorized Gmail accounts
export const ALLOWED_EMAILS = [
  "mesones536@gmail.com",
  "meson.sf@gmail.com",
  "sebastianmesonesu@gmail.com",
  "s.mesonesu@gmail.com",
  "sebastianmesonesugolini@gmail.com",
  "meson.s@gmail.com",
  "sebastian.mesones.ugolini@gmail.com"
];

// Google Login Pop-up
export async function loginWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

// Log out
export async function logoutUser() {
  return signOut(auth);
}

// Fetch user records from Firestore
export async function getCloudRecords(userId) {
  const q = query(collection(db, "records"), where("userId", "==", userId));
  const querySnapshot = await getDocs(q);
  const records = [];
  querySnapshot.forEach((doc) => {
    records.push({ id: doc.id, ...doc.data() });
  });
  return records;
}

// Add or update a record in Firestore
export async function addCloudRecord(userId, record) {
  const recordRef = doc(db, "records", record.id);
  await setDoc(recordRef, {
    ...record,
    userId,
    updatedAt: new Date().toISOString()
  });
}

// Delete a record from Firestore
export async function deleteCloudRecord(recordId) {
  const recordRef = doc(db, "records", recordId);
  await deleteDoc(recordRef);
}

// Bidirectional Sync on login
export async function syncIndexedDBWithCloud(userId) {
  try {
    const cloudRecords = await getCloudRecords(userId);
    const localRecords = await getAllRecords();

    if (cloudRecords.length === 0 && localRecords.length > 0) {
      // Upload local records to Firestore
      for (const rec of localRecords) {
        await addCloudRecord(userId, rec);
      }
      console.log("Uploaded local records to Firestore");
    } else if (cloudRecords.length > 0) {
      // Restore cloud records to IndexedDB (keeps device sync)
      await clearAllRecords();
      await bulkAddRecords(cloudRecords);
      console.log("Restored cloud records to IndexedDB");
    }
  } catch (error) {
    console.error("Error syncing IndexedDB with Firestore:", error);
  }
}
