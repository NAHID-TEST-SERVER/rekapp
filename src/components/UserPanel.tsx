import React, { useState, useEffect } from 'react';
import { addNotification } from '../services/notificationService';
import { collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc, getDocs, where, limit, or, setDoc, runTransaction as firestoreRunTransaction } from 'firebase/firestore';
import { ref, onValue, update as rtdbUpdate, runTransaction as rtdbRunTransaction } from 'firebase/database';
import { db, auth, rtdb } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrors';
import { removeUndefined, sanitizeProducts, sanitizeAddress } from '../utils/firestore';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  ShoppingCart, 
  Bell, 
  User as UserIcon, 
  X, 
  Plus, 
  Minus, 
  Trash2, 
  Star,
  Package,
  ArrowLeft,
  Search,
  Check,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  Phone,
  MessageCircle,
  CheckCircle
} from 'lucide-react';
import { toBanglaNumber, formatPrice, cn, formatDate } from '../utils';
import { PRODUCT_CATEGORIES } from '../constants';
import ProfileDashboard from './profile/ProfileDashboard';
import AuthScreen from './AuthScreen';
import AddressForm, { AddressData } from './profile/AddressForm';

// --- Sub-components ---

const CategoryList = ({ selectedCategory, onSelectCategory }: any) => {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
      {PRODUCT_CATEGORIES.map((cat: string) => (
        <button 
          key={cat} 
          onClick={() => onSelectCategory(cat)}
          className={cn(
            "px-4 py-2 rounded-full border shadow-sm text-xs font-medium whitespace-nowrap transition-colors",
            (selectedCategory === cat)
              ? "bg-primary text-white border-primary" 
              : "bg-white text-gray-600 border-gray-100 hover:bg-primary/10"
          )}
        >
          {cat}
        </button>
      ))}
    </div>
  );
};

const ProductCard = ({ product, onClick }: any) => {
  const offerPrice = product.discount 
    ? product.productPrice - (product.productPrice * product.discount / 100)
    : product.productPrice;
  
  const isOutOfStock = false;

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className={cn("bg-white rounded-[2px] p-3 shadow-sm border border-gray-100 flex flex-col gap-2")}
    >
      <div className="relative aspect-square rounded-[2px] overflow-hidden bg-gray-50 cursor-pointer" onClick={onClick}>
        <img src={product.productImage} className="w-full h-full object-cover" alt={product.productName} referrerPolicy="no-referrer" />
        {product.discount > 0 && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-[2px]">
            -{toBanglaNumber(product.discount)}%
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1 flex-1">
        <h3 className="text-xs font-bold text-gray-800 line-clamp-1">{product.productName}</h3>
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            {product.discount > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-primary">{formatPrice(offerPrice)}</span>
                <span className="text-[10px] text-gray-400 line-through">{formatPrice(product.productPrice)}</span>
              </div>
            ) : (
              <span className="text-sm font-bold text-primary">{formatPrice(product.productPrice)}</span>
            )}
          </div>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          className="mt-2 w-full py-2 rounded-[2px] text-xs font-bold transition-colors bg-primary text-white hover:bg-primary/90"
        >
          এখনই কিনুন
        </button>
      </div>
    </motion.div>
  );
};

// --- Main User Panel ---

export default function UserPanel() {
  const { user, userData, logoutAdmin } = useAuth();
  const { showToast } = useToast();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [products, setProducts] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [cart, setCart] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showCheckout, setShowCheckout] = useState(false);
  const [useSavedInfo, setUseSavedInfo] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [checkoutData, setCheckoutData] = useState({ name: '', mobile: '', address: '', note: '' });
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [lastOrderId, setLastOrderId] = useState('');
  const [profileData, setProfileData] = useState({ name: '', address: '' });
  const [orders, setOrders] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showStoreInfo, setShowStoreInfo] = useState(false);

  useEffect(() => {
    if (!user) return;
    const qNotifs = query(
      collection(db, 'notifications'), 
      where('targetRole', '==', 'user'), 
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const unsubNotifs = onSnapshot(qNotifs, (s) => {
      const allNotifs = s.docs.map(d => ({ id: d.id, ...d.data() }));
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const userNotifs = allNotifs.filter((n: any) => {
        const isTargetUser = !n.userId || n.userId === user.uid;
        const createdAtDate = n.createdAt?.toDate ? n.createdAt.toDate() : (n.createdAt ? new Date(n.createdAt) : null);
        const createdAtTime = createdAtDate ? createdAtDate.getTime() : 0;
        const isRecent = createdAtTime > sevenDaysAgo;
        return isTargetUser && isRecent;
      });
      setNotifications(userNotifs);
    });
    return () => unsubNotifs();
  }, [user]);
  const [showProfileUpdate, setShowProfileUpdate] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [isAddingAddress, setIsAddingAddress] = useState(false);

  useEffect(() => {
    if (!user && activeTab !== 'home') {
      setActiveTab('home');
    }
  }, [user, activeTab]);

  const hasProfileInfo = userData?.name && userData?.mobile && userData?.addresses && userData.addresses.length > 0;

  useEffect(() => {
    if (showCheckout && hasProfileInfo) {
      setUseSavedInfo(true);
      if (userData.addresses.length > 0) {
        setSelectedAddressId(userData.addresses[0].id);
      }
    } else if (showCheckout && !hasProfileInfo) {
      setUseSavedInfo(false);
      setCheckoutData({
        ...checkoutData,
        name: userData?.name || '',
        mobile: userData?.mobile || '',
        address: userData?.address || ''
      });
    }
  }, [showCheckout, userData]);

  const handleAddAddress = async (data: AddressData) => {
    if (!userData?.uid) return;

    setIsAddingAddress(true);
    try {
      let updatedAddresses = [...(userData.addresses || [])];

      data.id = Date.now().toString();
      data.createdAt = new Date().toISOString();

      if (data.isDefault) {
        updatedAddresses = updatedAddresses.map(a => ({ ...a, isDefault: false }));
      } else if (updatedAddresses.length === 0) {
        data.isDefault = true;
      }

      updatedAddresses.push(data);

      // Remove any undefined values
      const cleanAddresses = JSON.parse(JSON.stringify(updatedAddresses));

      await setDoc(doc(db, 'users', userData.uid), {
        addresses: cleanAddresses
      }, { merge: true });

      addNotification(userData.uid, 'নতুন ঠিকানা যোগ করা হয়েছে', `আপনার নতুন ঠিকানাটি সফলভাবে সেভ করা হয়েছে।`);

      setShowAddAddress(false);
      setSelectedAddressId(data.id);
      setUseSavedInfo(true);
      showToast('ঠিকানা সফলভাবে যোগ করা হয়েছে!', 'success');
    } catch (error) {
      console.error("Error saving address:", error);
      showToast('ঠিকানা সেভ করতে সমস্যা হয়েছে।', 'error');
    } finally {
      setIsAddingAddress(false);
    }
  };

  const checkAuth = (action: () => void) => {
    if (!user) {
      setPendingAction(() => action);
      setShowAuthModal(true);
      return false;
    }
    action();
    return true;
  };

  useEffect(() => {
    if (userData) {
      setProfileData({
        name: userData.name || '',
        address: userData.address || ''
      });
    }
  }, [userData]);

  useEffect(() => {
    setIsLoadingProducts(true);
    const unsubProducts = onValue(ref(rtdb, 'products'), (snapshot) => {
      const data = snapshot.val();
      setProducts(data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : []);
      setIsLoadingProducts(false);
    }, (error) => {
      console.error("Products RTDB error:", error);
      setIsLoadingProducts(false);
    });

    let unsubNotifs = () => {};

    let unsubOrders = () => {};
    if (userData?.uid) {
      unsubOrders = onSnapshot(query(collection(db, 'orders'), where('userId', '==', userData.uid)), (s) => {
        const fetchedOrders = s.docs.map(d => ({ id: d.id, ...d.data() }));
        const validOrders = fetchedOrders.filter((o: any) => o.status !== 'cancelled' && o.status !== 'Cancelled' && o.status !== 'বাতিল');
        setOrders(validOrders);
      }, (error) => {
        console.error("Orders Firestore error:", error);
      });
    }

    return () => { unsubProducts(); unsubNotifs(); unsubOrders(); };
  }, [user, userData]);

  const addToCart = (product: any) => {
    if (Number(product.stock) <= 0) {
      showToast('এই পণ্যটি বর্তমানে স্টক নেই!', 'error');
      return;
    }
    if (!checkAuth(() => {
      const existing = cart.find(item => item.id === product.id);
      const newQty = existing ? existing.quantity + 1 : 1;
      
      if (newQty > Number(product.stock)) {
        showToast(`দুঃখিত, মাত্র ${toBanglaNumber(product.stock)}টি পণ্য স্টকে আছে।`, 'error');
        return;
      }

      if (existing) {
        setCart(cart.map(item => item.id === product.id ? { ...item, quantity: newQty } : item));
      } else {
        setCart([...cart, { ...product, quantity: 1 }]);
      }
      showToast('কার্টে যোগ করা হয়েছে!');
      if (userData?.uid) {
        addNotification(userData.uid, 'কার্টে যোগ করা হয়েছে', `${product.productName} কার্টে যোগ করা হয়েছে।`);
      }
    })) return;
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
    showToast('কার্ট থেকে সরানো হয়েছে', 'error');
  };

  const updateQuantity = (id: string, delta: number) => {
    const product = products.find(p => p.id === id);
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        if (newQty > Number(product.stock)) {
          showToast(`দুঃখিত, মাত্র ${toBanglaNumber(product.stock)}টি পণ্য স্টকে আছে।`, 'error');
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.productPrice * item.quantity), 0);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkAuth(() => {})) return;
    if (cart.length === 0) return;
    
    // Final stock validation before checkout
    for (const item of cart) {
      const product = products.find(p => p.id === item.id);
      if (!product || Number(product.stock) < item.quantity) {
        showToast(`দুঃখিত, ${item.productName} পর্যাপ্ত স্টকে নেই।`, 'error');
        return;
      }
    }

    setIsCheckingOut(true);
    try {
      const currentUid = auth.currentUser?.uid;
      
      if (!currentUid) {
        showToast('অর্ডার করতে লগইন করা প্রয়োজন', 'error');
        setIsCheckingOut(false);
        return;
      }

      // Deduct stock using RTDB transaction
      for (const item of cart) {
        const productRef = ref(rtdb, `products/${item.id}`);
        await rtdbRunTransaction(productRef, (currentData) => {
          if (currentData === null) return null;
          if (Number(currentData.stock) < item.quantity) return null; // Should not happen due to validation
          return { ...currentData, stock: Number(currentData.stock) - item.quantity };
        });
      }

      const currentName = userData?.name || checkoutData.name || 'Anonymous';
      
      let finalName = checkoutData.name || currentName;
      let finalMobile = checkoutData.mobile;
      let finalAddress = checkoutData.address;

      if (useSavedInfo && userData && userData.addresses) {
        finalName = userData.name;
        finalMobile = userData.mobile;
        const selectedAddr = userData.addresses.find((a: any) => a.id === selectedAddressId) || userData.addresses[0];
        if (selectedAddr) {
          finalAddress = `${selectedAddr.label}: ${selectedAddr.fullAddress}`;
        }
      }

      if (!finalName || !finalMobile || !finalAddress) {
        showToast('সবগুলো তথ্য সঠিকভাবে পূরণ করুন', 'error');
        setIsCheckingOut(false);
        return;
      }

      const cleanProducts = sanitizeProducts(cart);
      const cleanAddress = sanitizeAddress(finalAddress);

      const orderData = removeUndefined({
        userId: currentUid || '',
        userName: currentName || '',
        userPhone: finalMobile || '',
        customerName: finalName || '',
        mobile: finalMobile || '',
        address: cleanAddress,
        deliveryName: finalName || '',
        deliveryPhone: finalMobile || '',
        deliveryAddress: cleanAddress,
        note: checkoutData.note || '',
        optionalNote: checkoutData.note || '',
        items: cleanProducts,
        total: cartTotal,
        paymentMethod: 'Cash on Delivery',
        status: 'Pending',
        orderStatus: 'Pending',
        isFromSavedProfile: !!useSavedInfo,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const finalPayload = JSON.parse(JSON.stringify(orderData));

      const orderRef = await addDoc(collection(db, 'orders'), finalPayload);
      setLastOrderId(orderRef.id);
      
      try {
        await updateDoc(doc(db, 'orders', orderRef.id), {
          orderId: orderRef.id
        });
      } catch (updateErr) {
        console.warn("Failed to update orderId, but order was created:", updateErr);
      }

      if (!useSavedInfo && currentUid) {
        try {
          const updateData: any = {};
          if (!userData?.name || userData.name !== finalName) updateData.name = finalName;
          if (!userData?.mobile || userData.mobile !== finalMobile) updateData.mobile = finalMobile;
          
          if (!userData?.addresses || userData.addresses.length === 0) {
            updateData.addresses = [{
              id: Date.now().toString(),
              label: 'বাসা',
              fullAddress: finalAddress,
              isDefault: true
            }];
          }

          if (Object.keys(updateData).length > 0) {
            await setDoc(doc(db, 'users', currentUid), updateData, { merge: true });
          }
        } catch (profileErr) {
          console.warn("Failed to update user profile:", profileErr);
        }
      }
      
      try {
        await addDoc(collection(db, 'notifications'), {
          title: 'নতুন অর্ডার এসেছে!',
          message: `${finalName} একটি নতুন অর্ডার প্লেস করেছেন। মোট মূল্য: ${formatPrice(cartTotal)}`,
          type: 'admin_order',
          target: 'admin',
          orderId: orderRef.id,
          createdAt: new Date().toISOString()
        });

        addNotification(currentUid, 'অর্ডার সফল হয়েছে!', `আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে। মোট মূল্য: ${formatPrice(cartTotal)}`, 'অর্ডার দেখুন', `/orders/${orderRef.id}`);
      } catch (notifErr) {
        console.warn("Failed to create notifications:", notifErr);
      }

      setCart([]);
      setOrderSuccess(true);
      showToast('অর্ডার সফলভাবে সম্পন্ন হয়েছে!', 'success');

    } catch (err) {
      console.error("Checkout Error:", err);
      try {
        handleFirestoreError(err, OperationType.WRITE, 'orders');
      } catch (e) {
        // Error already logged
      }
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      if (errorMessage.includes('permission-denied')) {
        showToast('অর্ডার করার অনুমতি নেই। দয়া করে এডমিনের সাথে যোগাযোগ করুন।', 'error');
      } else {
        showToast('অর্ডার করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।', 'error');
      }
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleTabChange = (id: string) => {
    if (id === 'home') {
      setActiveTab(id);
    } else {
      checkAuth(() => setActiveTab(id));
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.productName?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
    const matchesCategory = (selectedCategory && selectedCategory !== 'All') ? p.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

const ProductSkeleton = () => (
  <div className="bg-white rounded-[2px] p-3 shadow-sm border border-gray-100 flex flex-col gap-2 animate-pulse">
    <div className="aspect-square rounded-[2px] bg-gray-200" />
    <div className="h-3 bg-gray-200 rounded w-3/4" />
    <div className="h-4 bg-gray-200 rounded w-1/2 mt-auto" />
    <div className="h-8 bg-gray-200 rounded mt-2" />
  </div>
);

  const renderHome = () => (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input 
          type="text" 
          placeholder="প্রোডাক্ট খুঁজুন..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-white rounded-xl shadow-sm border border-gray-100 outline-none focus:ring-2 focus:ring-primary/20 text-xs"
        />
      </div>

      <CategoryList selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />

      <section>
        <div className="grid grid-cols-2 gap-2">
          {isLoadingProducts ? (
            Array(6).fill(0).map((_, i) => <ProductSkeleton key={i} />)
          ) : (
            filteredProducts.map((p) => (
              <ProductCard 
                key={p.id} 
                product={p} 
                onClick={() => setSelectedProduct(p)}
              />
            ))
          )}
        </div>
        {!isLoadingProducts && filteredProducts.length === 0 && (
          <div className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-200">
            <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-xs">কোনো পণ্য পাওয়া যায়নি</p>
          </div>
        )}
      </section>
    </div>
  );

  const renderCart = () => (
    <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-lg font-bold">আপনার কার্ট</h2>
      <div className="space-y-2">
        {cart.map((item) => (
          <div key={item.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex gap-3 items-center">
            <img src={item.productImage} className="w-16 h-16 rounded-lg object-cover" alt="" />
            <div className="flex-1">
              <h4 className="font-bold text-xs line-clamp-1">{item.productName}</h4>
              <p className="text-primary font-bold text-xs">{formatPrice(item.productPrice)}</p>
              <div className="flex items-center gap-2 mt-1">
                <button onClick={() => updateQuantity(item.id, -1)} className="p-1 bg-gray-100 rounded-md"><Minus className="w-3 h-3" /></button>
                <span className="font-bold text-xs">{toBanglaNumber(item.quantity)}</span>
                <button onClick={() => updateQuantity(item.id, 1)} className="p-1 bg-gray-100 rounded-md"><Plus className="w-3 h-3" /></button>
              </div>
            </div>
            <button onClick={() => removeFromCart(item.id)} className="text-red-400 p-2"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
        {cart.length === 0 && (
          <div className="text-center py-12">
            <ShoppingCart className="w-12 h-12 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-xs">আপনার কার্ট খালি</p>
            <button onClick={() => setActiveTab('home')} className="mt-2 text-primary font-bold text-xs">কেনাকাটা শুরু করুন</button>
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
          <div className="flex justify-between items-center text-gray-500 text-xs">
            <span>সাবটোটাল</span>
            <span>{formatPrice(cartTotal)}</span>
          </div>
          <div className="border-t border-gray-50 pt-3 flex justify-between items-center font-bold text-sm">
            <span>মোট</span>
            <span className="text-primary">{formatPrice(cartTotal)}</span>
          </div>
          <button 
            onClick={() => setShowCheckout(true)}
            className="w-full py-3 bg-primary text-white rounded-xl font-bold shadow-sm shadow-primary/30 active:scale-95 transition-transform text-xs"
          >
            অর্ডার কনফার্ম করুন
          </button>
        </div>
      )}

      {/* Checkout Modal */}
      <AnimatePresence>
        {showCheckout && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto shadow-xl"
            >
              {orderSuccess ? (
                <div className="py-12 text-center space-y-6 animate-in zoom-in duration-500 relative">
                  <button 
                    onClick={() => { setShowCheckout(false); setOrderSuccess(false); }}
                    className="absolute top-0 right-0 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                  <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <ShieldCheck className="w-12 h-12" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-gray-800">অর্ডার সফল হয়েছে!</h3>
                    <p className="text-sm text-gray-500">আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে।</p>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest">অর্ডার আইডি: #{lastOrderId.slice(-6).toUpperCase()}</p>
                  </div>
                  <div className="pt-4 flex justify-center">
                    <button 
                      onClick={() => {
                        setShowCheckout(false);
                        setOrderSuccess(false);
                        setActiveTab('profile');
                      }}
                      className="w-full max-w-[200px] py-4 bg-gray-800 text-white rounded-2xl font-bold shadow-lg active:scale-95 transition-transform"
                    >
                      অর্ডার লিস্ট দেখুন
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold">ডেলিভারি তথ্য</h3>
                    <button onClick={() => setShowCheckout(false)} className="p-2 bg-gray-100 rounded-full"><X className="w-4 h-4" /></button>
                  </div>

                  <form onSubmit={handleCheckout} className="space-y-4">
                    {hasProfileInfo && (
                      <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <div className="relative flex items-center justify-center">
                            <input 
                              type="checkbox" 
                              checked={useSavedInfo}
                              onChange={(e) => setUseSavedInfo(e.target.checked)}
                              className="peer appearance-none w-5 h-5 border-2 border-primary rounded-md checked:bg-primary transition-all"
                            />
                            <Check className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                          </div>
                          <span className="text-xs font-bold text-gray-700">Saved address use করুন</span>
                        </label>

                        {useSavedInfo && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-4 pt-4 border-t border-primary/10"
                          >
                            <div className="flex flex-col gap-1">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">নাম ও মোবাইল</p>
                              <p className="text-xs font-black text-gray-800">{userData.name} • {userData.mobile}</p>
                            </div>
                            <div className="flex flex-col gap-2">
                              <div className="flex justify-between items-center">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">ঠিকানা নির্বাচন করুন</p>
                                <button
                                  type="button"
                                  onClick={() => setShowAddAddress(!showAddAddress)}
                                  className="text-[10px] font-bold text-primary flex items-center gap-1"
                                >
                                  <Plus className="w-3 h-3" /> নতুন ঠিকানা
                                </button>
                              </div>
                              
                              {showAddAddress && (
                                <div className="mb-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                  <AddressForm
                                    onSubmit={handleAddAddress}
                                    onCancel={() => setShowAddAddress(false)}
                                    isSubmitting={isAddingAddress}
                                  />
                                </div>
                              )}

                              <div className="grid grid-cols-1 gap-2">
                                {userData.addresses.map((addr: any) => (
                                  <button
                                    key={addr.id}
                                    type="button"
                                    onClick={() => setSelectedAddressId(addr.id)}
                                    className={cn(
                                      "p-4 rounded-xl border text-left transition-all flex items-center justify-between gap-3",
                                      selectedAddressId === addr.id 
                                        ? "bg-white border-primary shadow-md ring-2 ring-primary/10" 
                                        : "bg-gray-50 border-gray-100 opacity-60 hover:opacity-100"
                                    )}
                                  >
                                    <div className="flex-1 overflow-hidden">
                                      <span className="text-[10px] font-black text-primary uppercase block mb-0.5">{addr.label}</span>
                                      <p className="text-xs text-gray-700 font-medium truncate">{addr.fullAddress}</p>
                                    </div>
                                    <div className={cn(
                                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                      selectedAddressId === addr.id ? "border-primary bg-primary text-white" : "border-gray-200"
                                    )}>
                                      {selectedAddressId === addr.id && <Check className="w-3 h-3" />}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    )}

                    {(!useSavedInfo || !hasProfileInfo) && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-3"
                      >
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 mb-1 block">আপনার নাম</label>
                          <input 
                            type="text" 
                            placeholder="আপনার নাম লিখুন"
                            required
                            className="w-full p-4 bg-gray-50 rounded-2xl outline-none border border-gray-100 text-xs focus:ring-2 focus:ring-primary/20"
                            value={checkoutData.name || ''}
                            onChange={e => setCheckoutData({...checkoutData, name: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 mb-1 block">মোবাইল নাম্বার</label>
                          <input 
                            type="tel" 
                            placeholder="আপনার মোবাইল নাম্বার"
                            required
                            className="w-full p-4 bg-gray-50 rounded-2xl outline-none border border-gray-100 text-xs focus:ring-2 focus:ring-primary/20"
                            value={checkoutData.mobile || ''}
                            onChange={e => setCheckoutData({...checkoutData, mobile: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 mb-1 block">ডেলিভারি ঠিকানা</label>
                          <textarea 
                            placeholder="আপনার সম্পূর্ণ ঠিকানা লিখুন (বাড়ি নং, রাস্তা, এলাকা)" 
                            required
                            className="w-full p-4 bg-gray-50 rounded-2xl outline-none border border-gray-100 h-24 focus:ring-2 focus:ring-primary/20 text-xs"
                            value={checkoutData.address || ''}
                            onChange={e => setCheckoutData({...checkoutData, address: e.target.value})}
                          />
                        </div>
                      </motion.div>
                    )}

                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 mb-1 block">অতিরিক্ত নোট (ঐচ্ছিক)</label>
                      <input 
                        type="text" 
                        placeholder="যেমন: কলিং বেল বাজাবেন" 
                        className="w-full p-4 bg-gray-50 rounded-2xl outline-none border border-gray-100 focus:ring-2 focus:ring-primary/20 text-xs"
                        value={checkoutData.note || ''}
                        onChange={e => setCheckoutData({...checkoutData, note: e.target.value})}
                      />
                    </div>

                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">অর্ডার সামারি</h4>
                      
                      <div className="bg-white p-3 rounded-xl border border-gray-100 mb-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">ডেলিভারি ঠিকানা</p>
                        {useSavedInfo && userData?.addresses ? (
                          <p className="text-xs text-gray-700">
                            {userData.addresses.find((a: any) => a.id === selectedAddressId)?.fullAddress || 
                             userData.addresses[0]?.fullAddress || 
                             'ঠিকানা নির্বাচন করুন'}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-700">
                            {checkoutData.address || 'ঠিকানা লিখুন'}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs text-gray-600">
                          <span>সাবটোটাল ({toBanglaNumber(cart.length)} আইটেম)</span>
                          <span>{formatPrice(cartTotal)}</span>
                        </div>
                        <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between items-center font-bold text-sm">
                          <span>সর্বমোট</span>
                          <span className="text-primary">{formatPrice(cartTotal)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4">
                      <button disabled={isCheckingOut} type="submit" className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/30 active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-50">
                        {isCheckingOut ? (
                          <><Loader2 className="w-5 h-5 animate-spin" /> অপেক্ষা করুন...</>
                        ) : (
                          <><Check className="w-5 h-5" /> অর্ডার প্লেস করুন</>
                        )}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { isRead: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const renderNotifications = () => (
    <div className="p-6 space-y-4">
      <h2 className="text-lg font-bold">নোটিফিকেশন</h2>
      {notifications.length === 0 ? (
        <p className="text-sm text-gray-500">কোনো নোটিফিকেশন নেই।</p>
      ) : (
        notifications.map(n => (
          <div 
            key={n.id} 
            onClick={() => !n.isRead && markAsRead(n.id)}
            className={`bg-white p-4 rounded-2xl shadow-sm border flex items-start gap-4 cursor-pointer transition-colors ${n.isRead ? 'border-gray-100 opacity-70' : 'border-primary/30 bg-primary/5'}`}
          >
            <div className={`p-3 rounded-full shrink-0 ${n.isRead ? 'bg-gray-100' : 'bg-primary/10'}`}>
              <Bell className={`w-5 h-5 ${n.isRead ? 'text-gray-400' : 'text-primary'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start gap-2 mb-1">
                <p className={`font-bold text-sm ${n.isRead ? 'text-gray-600' : 'text-gray-900'}`}>{n.title}</p>
                {n.isRead && <CheckCircle className="w-3 h-3 text-green-500 shrink-0 mt-1" />}
              </div>
              <p className={`text-xs leading-relaxed ${n.isRead ? 'text-gray-500' : 'text-gray-700 font-medium'}`}>
                {n.title === 'অর্ডার সফল হয়েছে!' ? (
                  n.message.split(/(৳[০-৯\d,]+)/g).map((part: string, i: number) => 
                    part.startsWith('৳') ? <span key={i} className="text-green-600 font-bold">{part}</span> : part
                  )
                ) : n.message}
              </p>
              <p className="text-[10px] text-gray-400 mt-1">{formatDate(n.createdAt)}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderProfile = () => (
    <ProfileDashboard userData={userData} orders={orders} notifications={notifications} />
  );

  const renderStoreInfo = () => (
    <AnimatePresence>
      {showStoreInfo && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden relative"
          >
            <button
              onClick={() => setShowStoreInfo(false)}
              className="absolute top-6 right-6 p-2 bg-gray-100 hover:bg-gray-200 rounded-full z-10 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
            
            <div className="p-8 space-y-6">
              <div className="text-center space-y-2">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-2xl font-black text-secondary uppercase">REK RADIANT TRADERS</h2>
                <p className="text-sm text-gray-500 font-medium">আপনার বিশ্বস্ত অনলাইন শপ</p>
              </div>

              <div className="space-y-4 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <div className="flex items-start gap-3">
                  <UserIcon className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">স্বত্বাধিকারী / এডমিন</p>
                    <p className="text-sm font-bold text-gray-800">MD. ASHIQUR RAHMAN</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">স্টোর পরিচিতি</p>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      আমরা দিচ্ছি সেরা মানের পণ্য এবং দ্রুত ডেলিভারি সার্ভিস। আমাদের লক্ষ্য গ্রাহকের সন্তুষ্টি এবং গুণগত মান বজায় রাখা। আমাদের সাথে কেনাকাটা করার জন্য ধন্যবাদ।
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <a 
                  href="tel:01715836897"
                  className="flex flex-col items-center gap-2 p-4 bg-white border border-gray-100 rounded-2xl hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <div className="p-2 bg-blue-50 rounded-full">
                    <Phone className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">কল করুন</span>
                  <span className="text-xs font-bold text-gray-800">01715836897</span>
                </a>

                <a 
                  href="https://wa.me/8801715836897"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 p-4 bg-white border border-gray-100 rounded-2xl hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <div className="p-2 bg-green-50 rounded-full">
                    <MessageCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">WhatsApp</span>
                  <span className="text-xs font-bold text-gray-800">01715836897</span>
                </a>
              </div>

              <div className="text-center pt-4">
                <p className="text-[10px] text-gray-400">© ২০২৬ REK RADIANT TRADERS - সর্বস্বত্ব সংরক্ষিত</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {renderStoreInfo()}
      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden relative"
            >
              <button 
                onClick={() => setShowAuthModal(false)}
                className="absolute top-6 right-6 p-2 bg-gray-100/50 hover:bg-gray-100 rounded-full z-[110] transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
              <div className="max-h-[90vh] overflow-y-auto no-scrollbar">
                <AuthScreen onAuthSuccess={() => {
                  setShowAuthModal(false);
                  if (pendingAction) {
                    pendingAction();
                    setPendingAction(null);
                  }
                }} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md p-4 sticky top-0 z-40 flex justify-between items-center border-b border-gray-100">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setShowStoreInfo(true)}>
          <img src="/Media/icon.jpeg" alt="Logo" className="w-10 h-10 object-cover rounded-[50px] border border-blue-500" onError={(e) => { (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/logo/100/100'; }} />
          <div className="flex flex-col">
            <h1 className="text-xs font-bold text-secondary">REK RADIANT TRADERS</h1>
            <p className="text-[10px] text-gray-500">01715836897</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4">
        {activeTab === 'home' && renderHome()}
        {activeTab === 'cart' && renderCart()}
        {activeTab === 'profile' && renderProfile()}
        {activeTab === 'notifications' && renderNotifications()}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 z-50 flex justify-between items-center shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        {[
          { id: 'home', label: 'হোম', icon: Home },
          { id: 'notifications', label: 'নোটিফিকেশন', icon: Bell, badge: notifications.filter(n => !n.isRead).length },
          { id: 'cart', label: 'কার্ট', icon: ShoppingCart, badge: cart.length },
          { id: 'profile', label: 'প্রোফাইল', icon: UserIcon },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => handleTabChange(item.id)}
            className={cn(
              "flex flex-col items-center gap-1 relative transition-colors",
              activeTab === item.id ? "text-primary" : "text-gray-400"
            )}
          >
            <div className="relative">
              <item.icon className={cn("w-6 h-6", activeTab === item.id && "fill-primary/10")} />
              {item.badge > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                  {toBanglaNumber(item.badge)}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Product Details Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center"
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-4">
                <button onClick={() => setSelectedProduct(null)} className="p-2 bg-gray-100 rounded-full"><ArrowLeft className="w-4 h-4" /></button>
                <h3 className="text-base font-bold">পণ্যের বিবরণ</h3>
                <button onClick={() => addToCart(selectedProduct)} className="p-2 bg-primary/10 text-primary rounded-full"><ShoppingCart className="w-4 h-4" /></button>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <img src={selectedProduct.productImage} className="w-full aspect-square object-cover rounded-xl shadow-md" alt="" />
                  {selectedProduct.discount > 0 && (
                    <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-sm">
                      -{toBanglaNumber(selectedProduct.discount)}% ছাড়
                    </span>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <h2 className="text-lg font-bold text-gray-800 leading-tight">{selectedProduct.productName}</h2>
                    <div className="flex items-center gap-1 bg-yellow-400/10 text-yellow-600 px-2 py-1 rounded-lg shrink-0">
                      <Star className="w-3 h-3 fill-yellow-400" />
                      <span className="text-[10px] font-bold">{toBanglaNumber(4.5)}</span>
                    </div>
                  </div>
                  <p className="text-primary font-medium text-[10px] bg-primary/10 inline-block px-2 py-0.5 rounded-lg">{selectedProduct.category}</p>
                </div>

                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-[9px] mb-0.5">মূল্য</span>
                    <div className="flex items-end gap-2">
                      <span className="text-xl font-bold text-primary">
                        {formatPrice(selectedProduct.discount ? selectedProduct.productPrice - (selectedProduct.productPrice * selectedProduct.discount / 100) : selectedProduct.productPrice)}
                      </span>
                      {selectedProduct.discount > 0 && (
                        <span className="text-[10px] text-gray-400 line-through mb-0.5">
                          {formatPrice(selectedProduct.productPrice)}
                        </span>
                      )}
                    </div>
                  </div>
                  {Number(selectedProduct.stock) < 10 ? (
                    <div className="bg-red-100 text-red-700 px-2 py-1 rounded-lg text-[10px] font-bold flex flex-col items-start leading-tight">
                      <span>স্টক নাই</span>
                      <span className="text-[8px] opacity-70">Stock: {toBanglaNumber(selectedProduct.stock)}</span>
                    </div>
                  ) : (
                    <div className="bg-green-100 text-green-700 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                      স্টক আছে
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                    <div className="w-1 h-3 bg-primary rounded-full"></div>
                    বিবরণ
                  </h4>
                  <p className="text-gray-600 text-xs leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">
                    {selectedProduct.productDescription || 'কোনো বিবরণ দেওয়া নেই।'}
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => { 
                      checkAuth(() => {
                        addToCart(selectedProduct); 
                        setSelectedProduct(null); 
                      });
                    }}
                    className="flex-1 py-2.5 bg-secondary text-white rounded-xl font-bold active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-sm text-xs"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    কার্টে যোগ করুন
                  </button>
                  <button 
                    onClick={() => { 
                      checkAuth(() => {
                        addToCart(selectedProduct); 
                        setActiveTab('cart'); 
                        setSelectedProduct(null); 
                      });
                    }}
                    className="flex-1 py-2.5 bg-primary text-white rounded-xl font-bold shadow-sm shadow-primary/30 active:scale-95 transition-transform flex items-center justify-center gap-2 text-xs"
                  >
                    <Package className="w-4 h-4" />
                    এখনই কিনুন
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
