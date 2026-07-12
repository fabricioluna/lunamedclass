import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  auth, db, ref, set, onValue, 
  GoogleAuthProvider, signInWithPopup, signOut,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile
} from '../firebase';
import { User as FirebaseUser } from 'firebase/auth';

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
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (name: string, email: string, pass: string) => Promise<void>;
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
        const userRef = ref(db, `users/${user.uid}`);
        
        onValue(userRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            setUserProfile(data);
          } else {
            const newProfile: UserProfile = {
              uid: user.uid,
              displayName: user.displayName,
              email: user.email,
              photoURL: user.photoURL,
              role: 'student', 
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString()
            };
            set(userRef, newProfile);
            setUserProfile(newProfile);
          }
          setIsLoadingAuth(false);
        }, { onlyOnce: true });
        
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
    await signInWithPopup(auth, provider);
  };

  const loginWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const registerWithEmail = async (name: string, email: string, pass: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    if (userCredential.user) {
      // Atualiza o perfil nativo do Firebase para exibir o nome corretamente na Header
      await updateProfile(userCredential.user, { displayName: name });
      // Força a atualização do estado local para refletir o nome de imediato
      setCurrentUser({ ...userCredential.user, displayName: name } as FirebaseUser);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ currentUser, userProfile, isLoadingAuth, loginWithGoogle, loginWithEmail, registerWithEmail, logout }}>
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