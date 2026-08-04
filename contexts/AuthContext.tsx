import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  auth, db, ref, set, onValue, 
  GoogleAuthProvider, signInWithPopup, signOut,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile,
  sendPasswordResetEmail
} from '../firebase';
import { User as FirebaseUser } from 'firebase/auth';

export type UserRole = 'student' | 'admin' | 'professor';

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  role: UserRole;
  periodId?: string; 
  createdAt: string;
  lastLogin: string;
}

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  isLoadingAuth: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (name: string, email: string, pass: string, periodId: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserPeriod: (periodId: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      unsubscribeProfile?.();
      unsubscribeProfile = null;

      setCurrentUser(user);

      if (user && db) {
        const userRef = ref(db, `users/${user.uid}`);
        let hasStampedLoginThisSession = false;

        unsubscribeProfile = onValue(userRef, (snapshot) => {
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

          // Grava lastLogin só depois de confirmar (ou criar) o perfil, e só uma vez por
          // sessão — senão a própria escrita realimenta este listener ao vivo.
          if (!hasStampedLoginThisSession) {
            hasStampedLoginThisSession = true;
            set(ref(db, `users/${user.uid}/lastLogin`), new Date().toISOString());
          }
        });
      } else {
        setUserProfile(null);
        setIsLoadingAuth(false);
      }
    });

    return () => {
      unsubscribeProfile?.();
      unsubscribeAuth();
    };
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const loginWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const registerWithEmail = async (name: string, email: string, pass: string, periodId: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    if (userCredential.user) {
      await updateProfile(userCredential.user, { displayName: name });
      
      const newProfile: UserProfile = {
        uid: userCredential.user.uid,
        displayName: name,
        email: email,
        photoURL: null,
        role: 'student',
        periodId: periodId,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };
      
      await set(ref(db, `users/${userCredential.user.uid}`), newProfile);
      // updateProfile já atualizou auth.currentUser no lugar; usar o objeto real em vez de
      // espalhar userCredential.user, que descartaria os métodos do protótipo (getIdToken etc.)
      setCurrentUser(auth.currentUser);
      setUserProfile(newProfile);
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const updateUserPeriod = async (periodId: string) => {
    if (currentUser && db) {
      await set(ref(db, `users/${currentUser.uid}/periodId`), periodId);
      setUserProfile(prev => prev ? { ...prev, periodId } : null);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ currentUser, userProfile, isLoadingAuth, loginWithGoogle, loginWithEmail, registerWithEmail, resetPassword, updateUserPeriod, logout }}>
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