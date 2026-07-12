import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import { 
  getDatabase, ref, onValue, push, remove, set, update, off 
} from "firebase/database";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyA_1Yjc5ez_9movyA4sGPM8z-9BZ3oeiLU", 
  authDomain: "monitor-virtual-fms.firebaseapp.com",
  databaseURL: "https://monitor-virtual-fms-default-rtdb.firebaseio.com",
  projectId: "monitor-virtual-fms",
  storageBucket: "monitor-virtual-fms.firebasestorage.app",
  messagingSenderId: "560311360671",
  appId: "1:560311360671:web:24fd3c03c865a11e0256aa",
  measurementId: "G-GJW5RPXJ1S"
};

const app = initializeApp(firebaseConfig);

if (typeof window !== "undefined") {
  getAnalytics(app);
}

export const auth = getAuth(app); 
export const db = getDatabase(app);
export { ref, onValue, push, remove, set, update, off };
export { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile
};

export const firestoreDB = getFirestore(app);
export const storage = getStorage(app);

export default app;