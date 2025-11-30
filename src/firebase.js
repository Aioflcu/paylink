
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup as _signInWithPopup,
  signOut as _signOut,
} from "firebase/auth";

import {
  getFirestore,
  doc as _doc,
  setDoc as _setDoc,
  getDoc as _getDoc,
  onSnapshot as _onSnapshot,
  collection as _collection,
  addDoc as _addDoc,
  serverTimestamp as _serverTimestamp,
} from "firebase/firestore";

// Firebase Configuration using environment variables
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

// Initialize app + services
const app = initializeApp(firebaseConfig);

// Auth
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();             

// Firestore
const db = getFirestore(app);

// Helper wrappers so other files can import names they expect
const provider = googleProvider; // alias if your code imports >
const signInWithPopup = (a, p) => _signInWithPopup(a, p);
const fbSignOut = async (a) => _signOut(a);

// Re-export Firestore helpers commonly used in your code
const doc = _doc;
const setDoc = _setDoc;
const getDoc = _getDoc;
const onSnapshot = _onSnapshot;
const collection = _collection;
const addDoc = _addDoc;
const serverTimestamp = _serverTimestamp;

// Convenience: save / update a user profile after first login
async function saveUserProfile(user) {
  if (!user?.uid) return null;
  const userRef = doc(db, "users", user.uid);
  await setDoc(
    userRef,
    {
      uid: user.uid,
      name: user.displayName || user?.name || "",
      email: user.email || "",
      photo: user.photoURL || null,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  return userRef;
}

export {
  app,
  auth,
  provider,
  googleProvider,
  signInWithPopup,
  fbSignOut,
  db,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  collection,
  addDoc,
  serverTimestamp,
  saveUserProfile,
};
export default app;