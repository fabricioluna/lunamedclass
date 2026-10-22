import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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

// Analytics não ajuda a primeira tela a aparecer, mas custa ~14 KB e 2-3 conexões logo na
// abertura. Fica para quando o navegador estiver ocioso (item 6.19).
if (typeof window !== "undefined") {
  const loadAnalytics = () => {
    import("firebase/analytics")
      .then(({ getAnalytics }) => getAnalytics(app))
      .catch(() => {});
  };
  if ("requestIdleCallback" in window) window.requestIdleCallback(loadAnalytics, { timeout: 5000 });
  else setTimeout(loadAnalytics, 3000);
}

export const auth = getAuth(app);
export {
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail
};

export const firestoreDB = getFirestore(app);

export default app;