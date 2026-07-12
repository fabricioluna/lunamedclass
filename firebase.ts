import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  getDatabase, ref, onValue, push, remove, set, update, off 
} from "firebase/database";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Boa prática: Lendo a chave da variável de ambiente com segurança
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;

if (!apiKey) {
  console.error("ERRO CRÍTICO: VITE_FIREBASE_API_KEY não está definida no arquivo .env");
}

const firebaseConfig = {
  apiKey: apiKey || "", 
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

export const firestoreDB = getFirestore(app);
export const storage = getStorage(app);

export default app;