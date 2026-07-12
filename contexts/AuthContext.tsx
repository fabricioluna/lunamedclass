import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db, ref, set, onValue, GoogleAuthProvider, signInWithPopup, signOut } from '../firebase';
import { User as FirebaseUser } from 'firebase/auth';

// === TIPOS DE PERFIL DE ACESSO (RBAC) ===
export type UserRole = 'student' | 'admin' | 'professor';

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  role: UserRole;
  createdAt: string;
  lastLogin: string;
}

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  isLoadingAuth: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      
      if (user && db) {
        // Sincronizar o Perfil com o Realtime Database
        const userRef = ref(db, `users/${user.uid}`);
        
        onValue(userRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            setUserProfile(data);
          } else {
            // Primeiro login: Criar o "Prontuário Acadêmico" do aluno
            const newProfile: UserProfile = {
              uid: user.uid,
              displayName: user.displayName,
              email: user.email,
              photoURL: user.photoURL,
              role: 'student', // Perfil padrão seguro
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString()
            };
            set(userRef, newProfile);
            setUserProfile(newProfile);
          }
          setIsLoadingAuth(false);
        }, { onlyOnce: true });
        
        // Atualiza a data do último login transacionalmente
        set(ref(db, `users/${user.uid}/lastLogin`), new Date().toISOString());

      } else {
        setUserProfile(null);
        setIsLoadingAuth(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("[AuthContext] Erro ao autenticar com o Google:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("[AuthContext] Erro ao deslogar:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, userProfile, isLoadingAuth, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};