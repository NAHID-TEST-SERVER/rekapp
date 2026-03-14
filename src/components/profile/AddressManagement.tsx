import React, { useState } from 'react';
import { MapPin, Plus, Trash2, X, Home, Briefcase, Map, Check, ArrowLeft, Edit2, Star } from 'lucide-react';
import { db } from '../../firebase';
import { doc, setDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '../../context/ToastContext';
import AddressForm, { AddressData } from './AddressForm';

export default function AddressManagement({ userData }: { userData: any }) {
  const { showToast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<AddressData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSaveAddress = async (data: AddressData) => {
    if (!userData?.uid) return;

    setIsSubmitting(true);
    try {
      let updatedAddresses = [...(userData.addresses || [])];

      // If it's a new address
      if (!data.id) {
        data.id = Date.now().toString();
        data.createdAt = new Date().toISOString();
      } else {
        data.updatedAt = new Date().toISOString();
        // Remove old version
        updatedAddresses = updatedAddresses.filter(a => a.id !== data.id);
      }

      // If this is set as default, remove default from others
      if (data.isDefault) {
        updatedAddresses = updatedAddresses.map(a => ({ ...a, isDefault: false }));
      } else if (updatedAddresses.length === 0) {
        // If it's the first address, make it default automatically
        data.isDefault = true;
      }

      updatedAddresses.push(data);

      await setDoc(doc(db, 'users', userData.uid), {
        addresses: updatedAddresses
      }, { merge: true });

      setShowAddForm(false);
      setEditingAddress(null);
      showToast(data.id ? 'ঠিকানা আপডেট করা হয়েছে!' : 'ঠিকানা সফলভাবে যোগ করা হয়েছে!', 'success');
    } catch (error) {
      console.error("Error saving address:", error);
      showToast('ঠিকানা সেভ করতে সমস্যা হয়েছে।', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAddress = async (address: any) => {
    if (!userData?.uid) return;
    // Removed window.confirm due to iframe restrictions

    try {
      let updatedAddresses = (userData.addresses || []).filter((a: any) => a.id !== address.id);
      
      // If we deleted the default address and there are others left, make the first one default
      if (address.isDefault && updatedAddresses.length > 0) {
        updatedAddresses[0].isDefault = true;
      }

      await setDoc(doc(db, 'users', userData.uid), {
        addresses: updatedAddresses
      }, { merge: true });
      showToast('ঠিকানা মুছে ফেলা হয়েছে।', 'success');
    } catch (error) {
      console.error("Error deleting address:", error);
      showToast('ঠিকানা মুছতে সমস্যা হয়েছে।', 'error');
    }
  };

  const handleSetDefault = async (address: any) => {
    if (!userData?.uid || address.isDefault) return;

    try {
      const updatedAddresses = (userData.addresses || []).map((a: any) => ({
        ...a,
        isDefault: a.id === address.id
      }));

      await setDoc(doc(db, 'users', userData.uid), {
        addresses: updatedAddresses
      }, { merge: true });
      showToast('ডিফল্ট ঠিকানা সেট করা হয়েছে।', 'success');
    } catch (error) {
      console.error("Error setting default address:", error);
      showToast('ডিফল্ট ঠিকানা সেট করতে সমস্যা হয়েছে।', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section as requested */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center space-y-3">
        <img 
          src="/Media/icon.jpeg" 
          alt="Logo" 
          className="w-16 h-16 object-cover rounded-full border-2 border-primary shadow-md" 
          onError={(e) => { (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/logo/100/100'; }} 
        />
        <div>
          <h2 className="text-lg font-black text-secondary uppercase tracking-tight">REK RADIANT TRADERS</h2>
          <p className="text-sm font-bold text-primary">০১৭১৫৮৩৬৮৯৭</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-800">ঠিকানা ব্যবস্থাপনা</h3>
        {!showAddForm && !editingAddress && (
          <button 
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-primary/10 text-primary rounded-xl font-bold hover:bg-primary hover:text-white transition-all flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" /> নতুন ঠিকানা
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {(showAddForm || editingAddress) ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 space-y-4"
          >
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-4">
              <h4 className="font-bold text-gray-800 text-lg">
                {editingAddress ? 'ঠিকানা এডিট করুন' : 'নতুন ঠিকানা যোগ করুন'}
              </h4>
              <button onClick={() => { setShowAddForm(false); setEditingAddress(null); }} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <AddressForm 
              initialData={editingAddress} 
              onSubmit={handleSaveAddress} 
              onCancel={() => { setShowAddForm(false); setEditingAddress(null); }}
              isSubmitting={isSubmitting}
            />
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {userData?.addresses && userData.addresses.length > 0 ? (
              userData.addresses
                .sort((a: any, b: any) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0))
                .map((addr: any) => (
                <div 
                  key={addr.id} 
                  className={`bg-white p-5 rounded-3xl shadow-sm border-2 transition-all relative overflow-hidden group ${
                    addr.isDefault ? 'border-primary' : 'border-gray-100 hover:border-primary/30'
                  }`}
                >
                  {addr.isDefault && (
                    <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current" /> ডিফল্ট
                    </div>
                  )}

                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                      addr.isDefault ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {addr.label === 'বাসা' ? <Home className="w-6 h-6" /> : 
                       addr.label === 'অফিস' ? <Briefcase className="w-6 h-6" /> : 
                       <MapPin className="w-6 h-6" />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-black text-gray-800 uppercase">{addr.label}</p>
                        <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                        <p className="text-sm font-bold text-gray-700 truncate">{addr.fullName}</p>
                      </div>
                      <p className="text-xs text-gray-500 mb-1">{addr.phone}</p>
                      <p className="text-xs text-gray-600 leading-relaxed font-medium">
                        {addr.fullAddress}, {addr.area}, {addr.district}, {addr.division}
                        {addr.postalCode && ` - ${addr.postalCode}`}
                      </p>
                      {addr.landmark && (
                        <p className="text-[10px] text-gray-400 mt-1">ল্যান্ডমার্ক: {addr.landmark}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-gray-50">
                    {!addr.isDefault && (
                      <button 
                        onClick={() => handleSetDefault(addr)}
                        className="text-[10px] font-bold text-gray-500 hover:text-primary px-3 py-1.5 rounded-lg hover:bg-primary/5 transition-colors"
                      >
                        ডিফল্ট করুন
                      </button>
                    )}
                    <button 
                      onClick={() => setEditingAddress(addr)}
                      className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-colors"
                      title="এডিট করুন"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteAddress(addr)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                      title="মুছে ফেলুন"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white p-12 rounded-[40px] border border-dashed border-gray-200 text-center">
                <MapPin className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-400 text-sm font-medium">কোনো ঠিকানা পাওয়া যায়নি</p>
                <button 
                  onClick={() => setShowAddForm(true)}
                  className="mt-4 px-6 py-2 bg-primary/10 text-primary rounded-xl font-bold text-sm hover:bg-primary hover:text-white transition-all"
                >
                  নতুন ঠিকানা যোগ করুন
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
