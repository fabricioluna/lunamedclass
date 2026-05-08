import { initializeApp } from "firebase/app";
import { 
  getDatabase, 
  ref, 
  onValue, 
  push, 
  remove, 
  set, 
  update,
  off 
} from "firebase/database";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// ⚠️ SEGURANÇA: Nenhuma credencial hardcoded. Tudo puxado do .env
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);

if (typeof window !== "undefined") {
  getAnalytics(app);
}

// ============================================================================
// ECOSSISTEMA LUNA MEDCLASS - CONEXÕES DE BANCO DE DADOS
// ============================================================================

// 1. Banco Realtime (Motor de Alta Performance para Simulados, OSCE e Analytics)
export const db = getDatabase(app);
export { ref, onValue, push, remove, set, update, off };

// 2. Banco Firestore e Storage (Repositório de Documentos e Mídia)
export const firestoreDB = getFirestore(app);
export const storage = getStorage(app);

export default app;