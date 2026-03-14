import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { User, Mail, Phone, Calendar, Briefcase, FileText } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export default function PersonalInfo({ userData }: { userData: any }) {
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(userData || {});

  const handleSave = async () => {
    if (!userData?.uid) return;
    try {
      await setDoc(doc(db, 'users', userData.uid), formData, { merge: true });
      setIsEditing(false);
      showToast('প্রোফাইল আপডেট করা হয়েছে', 'success');
    } catch (error) {
      console.error('Error updating profile:', error);
      showToast('প্রোফাইল আপডেট করতে সমস্যা হয়েছে', 'error');
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">ব্যক্তিগত তথ্য</h3>
        <button onClick={() => isEditing ? handleSave() : setIsEditing(true)} className="text-primary font-bold text-sm">
          {isEditing ? 'সংরক্ষণ করুন' : 'সম্পাদনা'}
        </button>
      </div>
      <div className="space-y-4">
        {[
          { label: 'নাম', key: 'name', icon: User },
          { label: 'মোবাইল', key: 'mobile', icon: Phone },
          { label: 'জন্ম তারিখ', key: 'dob', icon: Calendar },
          { label: 'পেশা', key: 'profession', icon: Briefcase },
          { label: 'বায়ো', key: 'bio', icon: FileText },
        ].map((field, i) => (
          <div key={i} className="space-y-1">
            <label className="text-xs text-gray-500 font-medium">{field.label}</label>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <field.icon className="w-4 h-4 text-gray-400" />
              <input
                disabled={!isEditing}
                value={formData[field.key] || ''}
                onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                className="w-full bg-transparent text-sm font-medium outline-none disabled:text-gray-600"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
