import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import AuthScreen from './components/AuthScreen';
import UserPanel from './components/UserPanel';
import AdminPanel from './components/AdminPanel';
import { Loader2, WifiOff } from 'lucide-react';
import { useState, useEffect } from 'react';
import { initializeCategories, migrateProducts } from './services/categoryService';

import { doc, getDocFromServer } from 'firebase/firestore';
import { db } from './firebase';

function AppContent() {
  const { user, userData, loading, isAdmin } = useAuth();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  useEffect(() => {
    initializeCategories();
    migrateProducts();
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <>
      {(isOffline || firebaseError) && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-[10px] py-1 text-center z-[100] flex flex-col items-center justify-center gap-1 shadow-md">
          <div className="flex items-center justify-center gap-2">
            <WifiOff className="w-3 h-3" /> {isOffline ? "আপনি বর্তমানে অফলাইনে আছেন।" : firebaseError}
          </div>
          {!isOffline && firebaseError && (
            <button 
              onClick={() => window.location.reload()} 
              className="underline font-bold"
            >
              পেজ রিফ্রেশ করুন
            </button>
          )}
        </div>
      )}
      {isAdmin ? <AdminPanel /> : <UserPanel />}
    </>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
