import React, { useState } from 'react';
import { User, MapPin, Package, Bell, Heart, Shield, Settings, Phone, LogOut, ArrowLeft, CheckCircle, Clock, Truck, ShoppingBag, Loader2 } from 'lucide-react';
import { toBanglaNumber } from '../../utils';
import { auth, db, storage } from '../../firebase';
import { useToast } from '../../context/ToastContext';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import PersonalInfo from './PersonalInfo';
import AddressManagement from './AddressManagement';
import OrderHistory from './OrderHistory';
import NotificationCenter from './NotificationCenter';
import SecuritySettings from './SecuritySettings';
import Support from './Support';

export default function ProfileDashboard({ userData, orders = [], notifications = [] }: { userData: any, orders?: any[], notifications?: any[] }) {
  const { showToast } = useToast();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [orderFilter, setOrderFilter] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const runningOrders = orders.filter(o => o.status !== 'delivered' && o.status !== 'Delivered' && o.status !== 'ডেলিভার্ড');
  const deliveredOrders = orders.filter(o => o.status === 'delivered' || o.status === 'Delivered' || o.status === 'ডেলিভার্ড');

  // Calculate profile completion
  const completionFields = ['name', 'mobile', 'profileImage', 'addresses', 'bio', 'dob'];
  const completedFields = completionFields.filter(field => {
    if (field === 'addresses') return userData?.addresses && userData.addresses.length > 0;
    return userData && userData[field];
  });
  const completionPercentage = Math.round((completedFields.length / completionFields.length) * 100);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userData?.uid) return;

    setUploading(true);
    try {
      const imageRef = storageRef(storage, `profiles/${userData.uid}_${Date.now()}`);
      await uploadBytes(imageRef, file);
      const url = await getDownloadURL(imageRef);
      
      await setDoc(doc(db, 'users', userData.uid), {
        profileImage: url
      }, { merge: true });
      showToast("ছবি সফলভাবে আপলোড হয়েছে", "success");
    } catch (error) {
      console.error("Error uploading image:", error);
      showToast("ছবি আপলোড করতে সমস্যা হয়েছে", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      showToast("লগআউট সফল হয়েছে", "success");
    } catch (error) {
      console.error("Error signing out:", error);
      showToast("লগআউট করতে সমস্যা হয়েছে।", "error");
    }
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'personal': return <PersonalInfo userData={userData} />;
      case 'address': return <AddressManagement userData={userData} />;
      case 'orders': return <OrderHistory userData={userData} orders={orders} initialFilter={orderFilter} />;
      case 'notifications': return <NotificationCenter userData={userData} notifications={notifications} />;
      case 'security': return <SecuritySettings />;
      case 'support': return <Support />;
      default:
        return (
          <div className="space-y-6">
            {/* Profile Header */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="relative">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 border border-blue-500 shadow-lg overflow-hidden relative group cursor-pointer">
                  {uploading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  ) : userData?.profileImage ? (
                    <img src={userData.profileImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10" />
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold">{userData?.name || userData?.fullName || 'ব্যবহারকারী'}</h2>
                <p className="text-gray-500 text-sm">{userData?.mobile}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">সক্রিয়</span>
                  <span className="text-[10px] text-gray-400">ID: {userData?.uid?.slice(0, 8)}</span>
                </div>
              </div>
              <button onClick={() => setActiveSection('personal')} className="text-primary font-bold text-xs">এডিট</button>
            </div>

            {/* Completion Indicator */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between text-xs font-bold mb-2">
                <span>প্রোফাইল সম্পন্ন</span>
                <span>{toBanglaNumber(completionPercentage)}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${completionPercentage}%` }}></div>
              </div>
            </div>

            {/* Account Summary */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'মোট অর্ডার', value: orders.length, icon: ShoppingBag, filter: null },
                { label: 'চলমান', value: runningOrders.length, icon: Clock, filter: 'running' },
                { label: 'ডেলিভার্ড', value: deliveredOrders.length, icon: Truck, filter: 'delivered' },
              ].map((item, i) => (
                <button 
                  key={i} 
                  onClick={() => {
                    setOrderFilter(item.filter);
                    setActiveSection('orders');
                  }}
                  className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-2 hover:bg-gray-50 transition-colors"
                >
                  <div className="p-2 bg-primary/10 rounded-xl text-primary"><item.icon className="w-5 h-5" /></div>
                  <div className="text-center">
                    <p className="font-bold text-sm">{toBanglaNumber(item.value)}</p>
                    <p className="text-gray-500 text-[10px]">{item.label}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Sections */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              {[
                { icon: Package, label: 'আমার অর্ডার', id: 'orders' },
                { icon: MapPin, label: 'ঠিকানা', id: 'address' },
                { icon: Bell, label: 'নোটিফিকেশন', id: 'notifications' },
                { icon: Shield, label: 'নিরাপত্তা', id: 'security' },
                { icon: Phone, label: 'সাপোর্ট', id: 'support' },
              ].map((item, i) => (
                <button key={i} onClick={() => {
                  if (item.id === 'orders') setOrderFilter(null);
                  setActiveSection(item.id);
                }} className="w-full p-4 flex items-center justify-between border-b border-gray-50 last:border-none hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5 text-gray-400" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                </button>
              ))}
            </div>

            <button 
              onClick={handleLogout}
              className="w-full py-4 bg-red-50 text-red-500 rounded-2xl font-bold flex items-center justify-center gap-2"
            >
              <LogOut className="w-5 h-5" /> লগআউট
            </button>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {activeSection && (
        <button onClick={() => setActiveSection(null)} className="flex items-center gap-2 text-sm font-bold text-gray-600">
          <ArrowLeft className="w-4 h-4" /> ফিরে যান
        </button>
      )}
      {renderSection()}
    </div>
  );
}
