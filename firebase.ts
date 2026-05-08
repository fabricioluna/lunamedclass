import { initializeApp } from "firebase/app";
import { 
  getDatabase, ref, onValue, push, remove, set, update, off 
} from "firebase/database";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// BLINDAGEM MÁXIMA: 
// Apenas a chave secreta vem do .env. 
// As rotas públicas ficam fixas para garantir que o Vercel e o Vite nunca falhem.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
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

// ============================================================================
// ECOSSISTEMA LUNA MEDCLASS - CONEXÕES DE BANCO DE DADOS
// ============================================================================

export const db = getDatabase(app);
export { ref, onValue, push, remove, set, update, off };

export const firestoreDB = getFirestore(app);
export const storage = getStorage(app);

export default app;