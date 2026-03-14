import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrors';
import { useToast } from './ToastContext';

interface AuthContextType {
  user: User | null;
  userData: any | null;
  loading: boolean;
  isAdmin: boolean;
  loginAdmin: () => void;
  logoutAdmin: () => void;
  pendingAction: (() => void) | null;
  setPendingAction: (action: (() => void) | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  isAdmin: false,
  loginAdmin: () => {},
  logoutAdmin: () => {},
  pendingAction: null,
  setPendingAction: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdminSession, setIsAdminSession] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  useEffect(() => {
    console.log('AuthProvider useEffect running');
    const adminSession = localStorage.getItem('adminSession');
    if (adminSession === 'true') {
      setIsAdminSession(true);
    }

    let unsubUser: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      
      if (unsubUser) unsubUser();

      if (currentUser) {
        unsubUser = onSnapshot(doc(db, 'users', currentUser.uid), (userDoc) => {
          if (userDoc.exists()) {
            const data = userDoc.data();
            
            // Check if user is blocked
            if (data.blocked === true) {
              auth.signOut();
              showToast('আপনার অ্যাকাউন্টটি ব্লক করা হয়েছে। অনুগ্রহ করে অ্যাডমিনের সাথে যোগাযোগ করুন।', 'error');
              setUserData(null);
              setLoading(false);
              return;
            }
            
            setUserData(data);
          } else {
            // Even if user doesn't exist in Firestore, provide basic data
            setUserData({ 
              uid: currentUser.uid, 
              name: currentUser.displayName || 'ব্যবহারকারী',
              role: 'user',
              addresses: []
            });
          }
          setLoading(false);
        }, (error) => {
          console.error("User Firestore error:", error);
          // On error, still set a default user data
          setUserData({ 
            uid: currentUser.uid, 
            name: currentUser.displayName || 'ব্যবহারকারী',
            role: 'user',
            addresses: []
          });
          setLoading(false);
        });
      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubUser) unsubUser();
    };
  }, []);

  const loginAdmin = useCallback(() => {
    localStorage.setItem('adminSession', 'true');
    setIsAdminSession(true);
  }, []);

  const logoutAdmin = useCallback(() => {
    localStorage.removeItem('adminSession');
    setIsAdminSession(false);
  }, []);

  const isAdmin = (isAdminSession && user !== null) || userData?.role === 'admin';

  const contextValue = useMemo(() => ({
    user,
    userData,
    loading,
    isAdmin,
    loginAdmin,
    logoutAdmin,
    pendingAction,
    setPendingAction
  }), [user, userData, loading, isAdmin, loginAdmin, logoutAdmin, pendingAction, setPendingAction]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
