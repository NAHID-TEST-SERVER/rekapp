import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Phone, Lock, User } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

export default function LoginModal({ isOpen, onClose, onLoginSuccess }: { isOpen: boolean, onClose: () => void, onLoginSuccess: () => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const authIdentifier = `${mobile}@app.com`;

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, authIdentifier, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, authIdentifier, password);
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          name,
          mobile,
          createdAt: new Date().toISOString()
        });
      }
      onLoginSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message === 'Firebase: Error (auth/invalid-credential).' ? 'ভুল মোবাইল নাম্বার বা পাসওয়ার্ড' : 'কিছু একটা সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">{isLogin ? 'লগইন করুন' : 'নতুন অ্যাকাউন্ট'}</h3>
              <button onClick={onClose} className="p-2 bg-gray-100 rounded-full"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">আপনার নাম</label>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                    <User className="w-4 h-4 text-gray-400" />
                    <input type="text" required value={name} onChange={e => setName(e.target.value)} className="bg-transparent outline-none w-full text-sm" placeholder="আপনার নাম" />
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">মোবাইল নাম্বার</label>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <input type="text" required value={mobile} onChange={e => setMobile(e.target.value)} className="bg-transparent outline-none w-full text-sm" placeholder="০১৭XXXXXXXX" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">পাসওয়ার্ড</label>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <Lock className="w-4 h-4 text-gray-400" />
                  <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="bg-transparent outline-none w-full text-sm" placeholder="******" />
                </div>
              </div>
              {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
              <button disabled={loading} type="submit" className="w-full py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/30">
                {loading ? 'অপেক্ষা করুন...' : (isLogin ? 'প্রবেশ করুন' : 'তৈরি করুন')}
              </button>
            </form>
            <button onClick={() => setIsLogin(!isLogin)} className="w-full mt-4 text-xs text-center text-gray-500 font-bold">
              {isLogin ? 'নতুন অ্যাকাউন্ট তৈরি করুন' : 'ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন করুন'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
