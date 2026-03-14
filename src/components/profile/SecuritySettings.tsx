import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { auth } from '../../firebase';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { useToast } from '../../context/ToastContext';

export default function SecuritySettings() {
  const { showToast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      showToast('সবগুলো ঘর পূরণ করুন', 'error');
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      showToast('নতুন পাসওয়ার্ড মিলছে না', 'error');
      return;
    }
    if (formData.newPassword.length < 6) {
      showToast('পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে', 'error');
      return;
    }

    const user = auth.currentUser;
    if (!user || !user.email) return;

    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, formData.currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, formData.newPassword);
      
      showToast('পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে', 'success');
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      console.error('Error updating password:', error);
      if (error.code === 'auth/invalid-credential') {
        showToast('বর্তমান পাসওয়ার্ড ভুল', 'error');
      } else {
        showToast('পাসওয়ার্ড পরিবর্তন করতে সমস্যা হয়েছে', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold">নিরাপত্তা</h3>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
        <div className="space-y-1">
          <label className="text-xs text-gray-500 font-medium">বর্তমান পাসওয়ার্ড</label>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <Lock className="w-4 h-4 text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="currentPassword"
              value={formData.currentPassword || ''}
              onChange={handleChange}
              className="w-full bg-transparent text-sm font-medium outline-none"
              placeholder="বর্তমান পাসওয়ার্ড লিখুন"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-500 font-medium">নতুন পাসওয়ার্ড</label>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <Lock className="w-4 h-4 text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="newPassword"
              value={formData.newPassword || ''}
              onChange={handleChange}
              className="w-full bg-transparent text-sm font-medium outline-none"
              placeholder="নতুন পাসওয়ার্ড লিখুন"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-500 font-medium">পাসওয়ার্ড নিশ্চিত করুন</label>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <Lock className="w-4 h-4 text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={formData.confirmPassword || ''}
              onChange={handleChange}
              className="w-full bg-transparent text-sm font-medium outline-none"
              placeholder="পাসওয়ার্ড পুনরায় লিখুন"
            />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'পাসওয়ার্ড পরিবর্তন করুন'}
        </button>
      </form>
    </div>
  );
}
