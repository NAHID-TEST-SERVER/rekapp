import React, { useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { ref, set, update } from 'firebase/database';
import { auth, db, rtdb } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, Lock, User, Eye, EyeOff, ShieldCheck, Loader2, X, Check, Mail, ArrowRight, ChevronLeft } from 'lucide-react';
import { cn } from '../utils';
import { useToast } from '../context/ToastContext';

export default function AuthScreen(props: { onAuthSuccess?: () => void }) {
  const { loginAdmin } = useAuth();
  const { showToast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    mobile: '',
    password: '',
    confirmPassword: '',
    name: ''
  });

  const [adminId, setAdminId] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    if (!adminId) {
      showToast('অ্যাডমিন আইডি লিখুন', 'error');
      setLoading(false);
      return;
    }
    
    if (adminId.length !== 8 || !/^\d+$/.test(adminId)) {
      showToast('শুধু ৮ সংখ্যার অ্যাডমিন আইডি দিন', 'error');
      setLoading(false);
      return;
    }

    try {
      const HARDCODED_ADMIN_ID = "51535759";
      
      if (adminId === HARDCODED_ADMIN_ID) {
        try {
          await signInWithEmailAndPassword(auth, '01715836897@app.com', adminId);
        } catch (authErr: any) {
          if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential') {
            const userCredential = await createUserWithEmailAndPassword(auth, '01715836897@app.com', adminId);
            await setDoc(doc(db, 'users', userCredential.user.uid), {
              uid: userCredential.user.uid,
              role: 'admin',
              mobile: '01715836897',
              name: 'Admin',
              status: 'active',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          } else {
            throw authErr;
          }
        }
        showToast('সফলভাবে অ্যাডমিন লগইন হয়েছে!', 'success');
        loginAdmin();
        if (props.onAuthSuccess) props.onAuthSuccess();
      } else {
        showToast('ভুল অ্যাডমিন আইডি', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast('লগইন করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const authIdentifier = `${formData.mobile}@app.com`;

    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, authIdentifier, formData.password);
        try {
          const now = new Date().toISOString();
          await update(ref(rtdb, `users/${userCredential.user.uid}`), {
            lastLoginAt: now
          });
          await updateDoc(doc(db, 'users', userCredential.user.uid), {
            lastLoginAt: now,
            updatedAt: now
          });
        } catch (e) {
          console.error("Failed to update lastLoginAt", e);
        }
        showToast('সফলভাবে লগইন হয়েছে!', 'success');
        if (props.onAuthSuccess) props.onAuthSuccess();
      } else {
        if (formData.password !== formData.confirmPassword) {
          throw new Error('পাসওয়ার্ড মিলছে না');
        }
        if (formData.mobile.length < 11) {
          throw new Error('সঠিক মোবাইল নাম্বার দিন');
        }

        const userCredential = await createUserWithEmailAndPassword(auth, authIdentifier, formData.password);
        const user = userCredential.user;

        await updateProfile(user, { displayName: formData.name });

        const now = new Date().toISOString();
        const userData = {
          uid: user.uid,
          mobile: formData.mobile,
          fullName: formData.name || 'ব্যবহারকারী',
          role: 'user',
          status: 'active',
          blocked: false,
          provider: 'phone',
          createdAt: now,
          updatedAt: now,
          lastLoginAt: now,
        };

        await setDoc(doc(db, 'users', user.uid), userData);
        try {
          await set(ref(rtdb, `users/${user.uid}`), userData);
        } catch (rtdbErr) {
          console.error("Failed to save to RTDB:", rtdbErr);
        }

        showToast('আপনার অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে', 'success');
        if (props.onAuthSuccess) props.onAuthSuccess();
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        showToast('মোবাইল নাম্বার বা পাসওয়ার্ড ভুল', 'error');
      } else if (err.code === 'auth/email-already-in-use') {
        showToast('এই মোবাইল নাম্বার দিয়ে ইতিমধ্যে অ্যাকাউন্ট খোলা হয়েছে', 'error');
      } else {
        showToast(err.message || 'কিছু একটা ভুল হয়েছে', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 sm:p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "w-full max-w-md overflow-hidden rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.08)] transition-all duration-700 relative",
          isAdminLogin ? "bg-white border-2 border-blue-500/20" : "bg-white"
        )}
      >
        {/* Decorative Background Elements */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl" />

        {/* Header Section */}
        <div className="p-10 pb-6 text-center relative z-10">
          <motion.div 
            key={isAdminLogin ? 'admin' : 'user'}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              "w-20 h-20 mx-auto mb-6 rounded-3xl flex items-center justify-center shadow-xl transform transition-all duration-500",
              isAdminLogin 
                ? "bg-gradient-to-br from-blue-600 to-indigo-700 text-white rotate-12" 
                : "bg-gradient-to-br from-emerald-500 to-teal-600 text-white -rotate-6"
            )}
          >
            {isAdminLogin ? <ShieldCheck className="w-10 h-10" /> : <User className="w-10 h-10" />}
          </motion.div>

          <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
            {isAdminLogin ? 'অ্যাডমিন পোর্টাল' : (isLogin ? 'স্বাগতম' : 'নতুন অ্যাকাউন্ট')}
          </h1>
          <div className="flex items-center justify-center gap-2">
            <div className={cn("h-1 w-8 rounded-full", isAdminLogin ? "bg-blue-500" : "bg-emerald-500")} />
            <p className="text-gray-500 font-semibold text-xs uppercase tracking-widest">
              {isAdminLogin ? 'SECURE ACCESS' : (isLogin ? 'LOGIN' : 'REGISTRATION')}
            </p>
            <div className={cn("h-1 w-8 rounded-full", isAdminLogin ? "bg-blue-500" : "bg-emerald-500")} />
          </div>
        </div>

        <div className="p-10 pt-4 relative z-10">
          {isAdminLogin ? (
            <form onSubmit={handleAdminAuth} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] ml-2">Admin Identity</label>
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    name="adminId"
                    placeholder="অ্যাডমিন আইডি (৮ সংখ্যা)"
                    required
                    maxLength={8}
                    className="w-full pl-14 pr-6 py-5 bg-gray-50 border-2 border-gray-100 text-gray-900 rounded-3xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all placeholder:text-gray-400 font-bold no-compact"
                    onChange={(e) => {
                      setAdminId(e.target.value);
                    }}
                    value={adminId}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-3xl font-black text-lg hover:shadow-2xl hover:shadow-blue-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3 no-compact"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                  <>
                    <span>অ্যাডমিন লগইন</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              <button 
                type="button"
                onClick={() => {
                  setIsAdminLogin(false);
                }}
                className="w-full py-3 text-gray-400 hover:text-blue-600 text-xs font-bold transition-colors flex items-center justify-center gap-2 uppercase tracking-widest no-compact"
              >
                <ChevronLeft className="w-4 h-4" /> ইউজার লগইন এ ফিরে যান
              </button>
            </form>
          ) : (
            <form onSubmit={handleAuth} className="space-y-6">
              {!isLogin && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] ml-2">Full Name</label>
                  <div className="relative group">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-600 transition-colors">
                      <User className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      name="name"
                      value={formData.name || ''}
                      placeholder="আপনার নাম (ঐচ্ছিক)"
                      className="w-full pl-14 pr-6 py-5 bg-gray-50 border-2 border-gray-100 rounded-3xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold no-compact"
                      onChange={handleChange}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] ml-2">Mobile Number</label>
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-600 transition-colors">
                    <Phone className="w-5 h-5" />
                  </div>
                  <input
                    type="tel"
                    name="mobile"
                    value={formData.mobile || ''}
                    placeholder="মোবাইল নাম্বার"
                    required
                    pattern="01[3-9][0-9]{8}"
                    className="w-full pl-14 pr-6 py-5 bg-gray-50 border-2 border-gray-100 rounded-3xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold no-compact"
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-2">
                  <label className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Password</label>
                  {isLogin && (
                    <button 
                      type="button"
                      onClick={() => showToast('Password is securely protected and cannot be viewed. Please contact admin for reset.', 'error')}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-700 transition-colors underline underline-offset-2 no-compact"
                    >
                      পাসওয়ার্ড ভুলে গেছেন?
                    </button>
                  )}
                </div>
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-600 transition-colors">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password || ''}
                    placeholder="পাসওয়ার্ড"
                    required
                    minLength={6}
                    className="w-full pl-14 pr-14 py-5 bg-gray-50 border-2 border-gray-100 rounded-3xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold no-compact"
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-600 transition-colors no-compact"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {!isLogin && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] ml-2">Confirm Password</label>
                  <div className="relative group">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-600 transition-colors">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword || ''}
                      placeholder="পুনরায় পাসওয়ার্ড"
                      required
                      minLength={6}
                      className="w-full pl-14 pr-14 py-5 bg-gray-50 border-2 border-gray-100 rounded-3xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold no-compact"
                      onChange={handleChange}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-600 transition-colors no-compact"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-3xl font-black text-lg hover:shadow-2xl hover:shadow-emerald-500/30 active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-3 no-compact"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (isLogin ? 'লগইন করুন' : 'অ্যাকাউন্ট তৈরি করুন')}
                {!loading && <ArrowRight className="w-5 h-5" />}
              </button>

              <div className="pt-6 flex flex-col items-center gap-6">
                <button 
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="group flex flex-col items-center gap-2 no-compact"
                >
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    {isLogin ? 'নতুন অ্যাকাউন্ট?' : 'ইতিমধ্যে অ্যাকাউন্ট আছে?'}
                  </span>
                  <span className="text-sm font-black text-emerald-600 group-hover:text-emerald-700 transition-colors border-b-2 border-emerald-600/20 group-hover:border-emerald-600 pb-1">
                    {isLogin ? 'অ্যাকাউন্ট তৈরি করুন' : 'লগইন করুন'}
                  </span>
                </button>

                <div className="w-full flex items-center gap-4">
                  <div className="h-px flex-1 bg-gray-100" />
                  <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">OR</span>
                  <div className="h-px flex-1 bg-gray-100" />
                </div>

                <button 
                  type="button"
                  onClick={() => setIsAdminLogin(true)}
                  className="px-6 py-2 rounded-full border border-gray-100 text-[10px] font-black text-gray-400 hover:text-blue-600 hover:border-blue-100 hover:bg-blue-50 transition-all uppercase tracking-widest no-compact"
                >
                  অ্যাডমিন লগইন
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
