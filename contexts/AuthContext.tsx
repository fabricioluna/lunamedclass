import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  auth,
  GoogleAuthProvider, signInWithPopup, signOut,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile,
  sendPasswordResetEmail
} from '../firebase';
import { User as FirebaseUser } from 'firebase/auth';
import {
  UserProfile, UserRole, subscribeToProfile, createProfile, stampLastLogin, updateUserPeriod as updateUserPeriodService,
} from '../services/authService';

export type { UserRole, UserProfile };

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      unsubscribeProfile?.();
      unsubscribeProfile = null;

      setCurrentUser(user);

      if (user) {
        // Autoridade de admin vem do Custom Claim no ID token, não do campo users/{uid}.role
        // (decorativo — ver D5 / scripts/set-admin-claim.mjs). Claims só refletem depois de
        // um novo login, então isso é lido uma vez por sessão, não em tempo real.
        const tokenResult = await user.getIdTokenResult();
        setIsAdmin(tokenResult.claims.admin === true);

        let hasStampedLoginThisSession = false;

        unsubscribeProfile = subscribeToProfile(user.uid, (profile) => {
          if (profile) {
            setUserProfile(profile);
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
            createProfile(newProfile);
            setUserProfile(newProfile);
          }
          setIsLoadingAuth(false);

          // Grava lastLogin só depois de confirmar (ou criar) o perfil, e só uma vez por
          // sessão — senão a própria escrita realimenta este listener ao vivo.
          if (!hasStampedLoginThisSession && profile) {
            hasStampedLoginThisSession = true;
            stampLastLogin(user.uid);
          }
        }, (error) => {
          // Nunca deixar isLoadingAuth travado por um erro de permissão (ex: firestore.rules
          // ainda não publicado) — mesma lição do incidente de isLoading da Etapa 2, agora do
          // lado do perfil autenticado em vez da leitura anônima de periods/disciplines.
          console.error('Falha ao carregar o perfil do usuário:', error);
          setIsLoadingAuth(false);
        });
      } else {
        setUserProfile(null);
        setIsAdmin(false);
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

      await createProfile(newProfile);
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
    if (currentUser) {
      await updateUserPeriodService(currentUser.uid, periodId);
      setUserProfile(prev => prev ? { ...prev, periodId } : null);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ currentUser, userProfile, isAdmin, isLoadingAuth, loginWithGoogle, loginWithEmail, registerWithEmail, resetPassword, updateUserPeriod, logout }}>
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
