import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  limit, 
  addDoc, 
  deleteDoc, 
  where,
  getDocs,
  setDoc,
  or,
  serverTimestamp
} from 'firebase/firestore';
import { ref, onValue, push, set, remove, update as rtdbUpdate, runTransaction } from 'firebase/database';
import { db, auth, rtdb } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Users, 
  ShoppingCart, 
  Palette, 
  LogOut, 
  TrendingUp,
  Clock,
  Check,
  X,
  Menu,
  Package,
  Plus,
  Settings,
  Bell,
  Search,
  Filter,
  Info,
  FileText,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Image as ImageIcon,
  Save,
  MapPin,
  MessageSquare,
  Loader2,
  User,
  Phone,
  Mail,
  CheckCircle
} from 'lucide-react';
import { toBanglaNumber, formatPrice, cn } from '../utils';
import { PRODUCT_CATEGORIES } from '../constants';
import { useToast } from '../context/ToastContext';

export default function AdminPanel() {
  const { userData, logoutAdmin } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [stats, setStats] = useState({ 
    users: 0, 
    orders: 0, 
    pending: 0, 
    products: 0, 
    delivered: 0,
    newUsers: 0,
    newNotifs: 0
  });
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [bulkMessages, setBulkMessages] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [siteSettings, setSiteSettings] = useState<any>({});
  const [themeSettings, setThemeSettings] = useState<any>({});
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [isSavingSite, setIsSavingSite] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState('All');
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  
  // Form states
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [selectedDeliveredOrder, setSelectedDeliveredOrder] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  function formatPricePlain(price: any) {
    const num = Number(price);
    return isNaN(num) ? '0' : num.toLocaleString('en-US');
  }

  function generateReport(range: '7days' | '30days' | 'lastMonth' | 'all', isPreview: boolean = false) {
    try {
      const now = new Date();
      let filteredOrders = orders;
      let filteredProducts = products;
      let title = 'All Updates';
      let dateRange = 'All Time';

      if (range === '7days') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filteredOrders = orders.filter(o => o.createdAt && new Date(o.createdAt) >= sevenDaysAgo);
        filteredProducts = products.filter(p => p.createdAt && new Date(p.createdAt) >= sevenDaysAgo);
        title = '7 Days Update';
        dateRange = `Last 7 Days (${sevenDaysAgo.toLocaleDateString()} - ${now.toLocaleDateString()})`;
      } else if (range === '30days') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filteredOrders = orders.filter(o => o.createdAt && new Date(o.createdAt) >= thirtyDaysAgo);
        filteredProducts = products.filter(p => p.createdAt && new Date(p.createdAt) >= thirtyDaysAgo);
        title = '30 Days Update';
        dateRange = `Last 30 Days (${thirtyDaysAgo.toLocaleDateString()} - ${now.toLocaleDateString()})`;
      } else if (range === 'lastMonth') {
        const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        filteredOrders = orders.filter(o => {
          if (!o.createdAt) return false;
          const d = new Date(o.createdAt);
          return d >= firstDayLastMonth && d <= lastDayLastMonth;
        });
        filteredProducts = products.filter(p => {
          if (!p.createdAt) return false;
          const d = new Date(p.createdAt);
          return d >= firstDayLastMonth && d <= lastDayLastMonth;
        });
        title = 'Last Month Update';
        dateRange = `${firstDayLastMonth.toLocaleDateString()} - ${lastDayLastMonth.toLocaleDateString()}`;
      }

      filteredOrders.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      const pending = filteredOrders.filter((o: any) => o.status === 'Pending' || o.status === 'পেন্ডিং').length;
      const delivered = filteredOrders.filter((o: any) => o.status === 'Delivered' || o.status === 'ডেলিভার্ড').length;
      
      const deliveredTotal = filteredOrders
        .filter((o: any) => o.status === 'Delivered' || o.status === 'ডেলিভার্ড')
        .reduce((sum: number, o: any) => sum + Number(o.totalAmount || o.total || 0), 0);

      const reportData = {
        title,
        dateRange,
        productsAdded: filteredProducts.length,
        pending,
        delivered,
        orders: filteredOrders.map((o: any, index: number) => ({
          count: index + 1,
          name: o.customerName || 'N/A',
          number: o.phone || o.customerPhone || 'N/A',
          date: o.createdAt ? new Date(o.createdAt).toLocaleString() : 'N/A',
          status: o.status || 'N/A',
          price: formatPricePlain(o.totalAmount || o.total || 0),
          rawPrice: Number(o.totalAmount || o.total || 0)
        }))
      };

      if (isPreview) {
        setSelectedReport(reportData);
        return;
      }

      const doc = new jsPDF();
      doc.text(title, 14, 15);
      doc.setFontSize(10);
      doc.text(`Date Range: ${dateRange}`, 14, 22);
      doc.text(`Products Added: ${reportData.productsAdded}`, 14, 28);
      doc.text(`Pending Orders: ${pending}`, 14, 34);
      doc.text(`Delivered Orders: ${delivered}`, 14, 40);

      autoTable(doc, {
        startY: 45,
        head: [['COUNT', 'NAME', 'NUMBER', 'DATE', 'STATUS', 'PRICE']],
        body: reportData.orders.map(o => [o.count, o.name, o.number, o.date, o.status, formatPricePlain(o.rawPrice)]),
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 4) {
            const status = data.cell.raw;
            if (status === 'Delivered' || status === 'ডেলিভার্ড') {
              data.cell.styles.fillColor = [220, 252, 231];
            } else if (status === 'Cancelled' || status === 'বাতিল') {
              data.cell.styles.fillColor = [254, 226, 226];
            }
          }
        }
      });
      
      const finalY = (doc as any).lastAutoTable.finalY || 50;
      doc.text(`ডেলিভার্ড পণ্যের মোট মূল্য: ${formatPricePlain(deliveredTotal)}`, 14, finalY + 10);

      doc.save(`report-${range === 'lastMonth' ? 'last-month' : range}.pdf`);
    } catch (error) {
      console.error("Report generation error:", error);
      showToast('রিপোর্ট জেনারেট করতে সমস্যা হয়েছে।', 'error');
    }
  }
  const [newProduct, setNewProduct] = useState({
    productName: '',
    productDescription: '',
    productPrice: '',
    discount: '0',
    stock: '',
    category: '',
    productImage: 'https://picsum.photos/seed/product/400/400',
    status: 'সক্রিয়'
  });

  const [newNotif, setNewNotif] = useState({
    title: '',
    message: '',
    type: 'সাধারণ',
    buttonText: '',
    buttonLink: ''
  });

  const [newPromotion, setNewPromotion] = useState({
    title: '',
    description: '',
    discount: '',
    startDate: '',
    endDate: '',
    productId: '',
    isActive: true
  });

  const [newBulkMessage, setNewBulkMessage] = useState({
    title: '',
    message: ''
  });

  useEffect(() => {
    // Fetch all necessary data
    const qOrders = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubOrders = onSnapshot(qOrders, (s) => {
      const o = s.docs.map(d => ({ id: d.id, ...d.data() }));
      setOrders(o);
      setStats(prev => ({ 
        ...prev, 
        orders: o.length,
        pending: o.filter((ord: any) => ord.status === 'পেন্ডিং' || ord.status === 'Pending').length,
        delivered: o.filter((ord: any) => ord.status === 'ডেলিভার্ড' || ord.status === 'Delivered').length
      }));
      setIsLoadingOrders(false);
    }, (error) => {
      console.error("Admin Orders error:", error);
      setIsLoadingOrders(false);
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (s) => {
      const u = s.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(u);
      setStats(prev => ({ 
        ...prev, 
        users: u.length,
        newUsers: u.filter((usr: any) => {
          const regDate = new Date(usr.createdAt);
          const today = new Date();
          return regDate.toDateString() === today.toDateString();
        }).length
      }));
    }, (error) => console.error("Admin Users error:", error));

    const unsubProducts = onValue(ref(rtdb, 'products'), (snapshot) => {
      const data = snapshot.val();
      const p = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
      setProducts(p);
      setStats(prev => ({ 
        ...prev, 
        products: p.length,
        lowStock: p.filter((prod: any) => Number(prod.stock) < 5).length
      }));
    }, (error) => {
      console.error("Admin Products RTDB error:", error);
    });

    const unsubPromotions = onSnapshot(collection(db, 'promotions'), (s) => {
      setPromotions(s.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => console.error("Admin Promotions error:", error));
    const unsubBulkMessages = onSnapshot(collection(db, 'bulkMessages'), (s) => {
      setBulkMessages(s.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => console.error("Admin BulkMessages error:", error));
    const unsubOffers = onSnapshot(collection(db, 'offers'), (s) => {
      setOffers(s.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => console.error("Admin Offers error:", error));

    const unsubNotifs = onSnapshot(query(collection(db, 'notifications'), where('targetRole', '==', 'admin'), orderBy('createdAt', 'desc')), (s) => {
      const allNotifs = s.docs.map(d => ({ id: d.id, ...d.data() }));
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const filteredNotifs = allNotifs.filter((n: any) => {
        const createdAtDate = n.createdAt?.toDate ? n.createdAt.toDate() : (n.createdAt ? new Date(n.createdAt) : null);
        const createdAtTime = createdAtDate ? createdAtDate.getTime() : 0;
        return createdAtTime > sevenDaysAgo;
      });
      setNotifications(filteredNotifs);
      setStats(prev => ({ ...prev, newNotifs: filteredNotifs.length }));
    }, (error) => console.error("Admin Notifications error:", error));

    const unsubSettings = onSnapshot(doc(db, 'settings', 'site'), (s) => {
      if (s.exists()) setSiteSettings(s.data());
    }, (error) => console.error("Admin Settings error:", error));

    const unsubTheme = onSnapshot(doc(db, 'settings', 'theme'), (s) => {
      if (s.exists()) setThemeSettings(s.data());
    }, (error) => console.error("Admin Theme error:", error));

    return () => {
      unsubOrders();
      unsubUsers();
      unsubProducts();
      unsubPromotions();
      unsubBulkMessages();
      unsubOffers();
      unsubNotifs();
      unsubSettings();
      unsubTheme();
    };
  }, []);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(newProduct.productPrice) < 0) {
      showToast('পণ্যের দাম নেগেটিভ হতে পারবে না।', 'error');
      return;
    }
    try {
      if (editingProductId) {
        await rtdbUpdate(ref(rtdb, `products/${editingProductId}`), {
          ...newProduct,
          productPrice: Number(newProduct.productPrice),
          discount: Number(newProduct.discount),
          stock: Number(newProduct.stock),
          updatedAt: new Date().toISOString()
        });
        showToast('প্রোডাক্ট আপডেট করা হয়েছে।', 'success');
      } else {
        const newProductRef = push(ref(rtdb, 'products'));
        await set(newProductRef, {
          ...newProduct,
          productPrice: Number(newProduct.productPrice),
          discount: Number(newProduct.discount),
          stock: Number(newProduct.stock),
          createdAt: new Date().toISOString()
        });
        showToast('নতুন প্রোডাক্ট যোগ করা হয়েছে।', 'success');
      }
      setShowAddProduct(false);
      setEditingProductId(null);
      setNewProduct({
        productName: '',
        productDescription: '',
        productPrice: '',
        discount: '0',
        stock: '',
        category: '',
        productImage: 'https://picsum.photos/seed/product/400/400',
        status: 'সক্রিয়'
      });
    } catch (err) { console.error(err); }
  };

  const editProduct = (product: any) => {
    setNewProduct({
      productName: product.productName,
      productDescription: product.productDescription,
      productPrice: String(product.productPrice),
      discount: String(product.discount || 0),
      stock: String(product.stock),
      category: product.category,
      productImage: product.productImage,
      status: product.status || 'সক্রিয়'
    });
    setEditingProductId(product.id);
    setShowAddProduct(true);
  };

  const deleteProduct = async (id: string) => {
    // Removed window.confirm due to iframe restrictions
    try {
      await remove(ref(rtdb, `products/${id}`));
      showToast('প্রোডাক্ট মুছে ফেলা হয়েছে।', 'success');
    } catch (error) {
      console.error("Error deleting product:", error);
      showToast('প্রোডাক্ট মুছতে সমস্যা হয়েছে।', 'error');
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      const oldStatus = order.status;
      
      // If status is changing TO Cancelled/বাতিল
      if ((status === 'Cancelled' || status === 'বাতিল') && (oldStatus !== 'Cancelled' && oldStatus !== 'বাতিল')) {
        // Return stock
        for (const item of order.items || []) {
          const productRef = ref(rtdb, `products/${item.id}`);
          await runTransaction(productRef, (currentData) => {
            if (currentData === null) return null;
            return { ...currentData, stock: Number(currentData.stock) + item.quantity };
          });
        }

        // Send notification to user
        if (order.userId) {
          const productNames = (order.items || []).map((i: any) => i.productName).join(', ');
          const price = order.totalAmount || order.total || 0;
          try {
            await addDoc(collection(db, 'notifications'), {
              userId: order.userId,
              title: 'অর্ডারটি বাতিল করা হয়েছে',
              message: `${productNames}\nমূল্য: ${formatPrice(price)}`,
              type: 'সাধারণ',
              isRead: false,
              createdAt: new Date().toISOString(),
              targetRole: 'user'
            });
          } catch (notifErr) {
            console.error("Failed to send cancellation notification:", notifErr);
          }
        }
      }
      // If status is changing FROM Cancelled/বাতিল to something else (e.g. Pending)
      else if ((oldStatus === 'Cancelled' || oldStatus === 'বাতিল') && (status !== 'Cancelled' && status !== 'বাতিল')) {
        // Deduct stock again
        for (const item of order.items || []) {
          const productRef = ref(rtdb, `products/${item.id}`);
          await runTransaction(productRef, (currentData) => {
            if (currentData === null) return null;
            return { ...currentData, stock: Math.max(0, Number(currentData.stock) - item.quantity) };
          });
        }
      }

      await updateDoc(doc(db, 'orders', orderId), { 
        status,
        orderStatus: status,
        updatedAt: new Date().toISOString()
      });
      showToast('অর্ডারের স্ট্যাটাস আপডেট করা হয়েছে।', 'success');
    } catch (error) {
      console.error("Error updating order status:", error);
      showToast('স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে।', 'error');
    }
  };

  const handleCreateNotif = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'notifications'), {
        ...newNotif,
        targetRole: 'admin',
        createdAt: serverTimestamp()
      });
      setNewNotif({ 
        title: '', 
        message: '', 
        type: 'সাধারণ',
        buttonText: '',
        buttonLink: ''
      });
      showToast('নোটিফিকেশন পাঠানো হয়েছে!', 'success');
    } catch (err) { 
      console.error(err);
      showToast('নোটিফিকেশন পাঠাতে সমস্যা হয়েছে।', 'error');
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { isRead: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleCreatePromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'promotions'), {
        ...newPromotion,
        createdAt: new Date().toISOString()
      });
      // Trigger notification
      await addDoc(collection(db, 'notifications'), {
        title: 'নতুন প্রমোশন: ' + newPromotion.title,
        message: newPromotion.description,
        type: 'অফার',
        targetRole: 'user',
        createdAt: serverTimestamp()
      });
      setNewPromotion({
        title: '',
        description: '',
        discount: '',
        startDate: '',
        endDate: '',
        productId: '',
        isActive: true
      });
      showToast('প্রমোশন তৈরি হয়েছে!', 'success');
    } catch (err) { 
      console.error(err);
      showToast('প্রমোশন তৈরি করতে সমস্যা হয়েছে।', 'error');
    }
  };

  const handleCreateBulkMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'bulkMessages'), {
        ...newBulkMessage,
        createdAt: new Date().toISOString()
      });
      // Trigger notification for all users
      await addDoc(collection(db, 'notifications'), {
        title: 'নতুন বার্তা: ' + newBulkMessage.title,
        message: newBulkMessage.message,
        type: 'সাধারণ',
        targetRole: 'user',
        createdAt: serverTimestamp()
      });
      setNewBulkMessage({ title: '', message: '' });
      showToast('বাল্ক মেসেজ পাঠানো হয়েছে!', 'success');
    } catch (err) { 
      console.error(err);
      showToast('বাল্ক মেসেজ পাঠাতে সমস্যা হয়েছে।', 'error');
    }
  };

  const updateTheme = (key: string, value: string) => {
    setThemeSettings((prev: any) => ({ ...prev, [key]: value }));
  };

  const saveThemeSettings = async () => {
    setIsSavingTheme(true);
    try {
      const cleanTheme = JSON.parse(JSON.stringify(themeSettings));
      await setDoc(doc(db, 'settings', 'theme'), cleanTheme, { merge: true });
      showToast('থিম সেটিংস সফলভাবে সেভ করা হয়েছে!', 'success');
    } catch (err) {
      console.error(err);
      showToast('থিম সেটিংস সেভ করতে সমস্যা হয়েছে।', 'error');
    } finally {
      setIsSavingTheme(false);
    }
  };

  const updateSiteSettings = (key: string, value: string) => {
    setSiteSettings((prev: any) => ({ ...prev, [key]: value }));
  };

  const saveSiteSettings = async () => {
    setIsSavingSite(true);
    try {
      const cleanSite = JSON.parse(JSON.stringify(siteSettings));
      await setDoc(doc(db, 'settings', 'site'), cleanSite, { merge: true });
      showToast('সাইট সেটিংস সফলভাবে সেভ করা হয়েছে!', 'success');
    } catch (err) {
      console.error(err);
      showToast('সাইট সেটিংস সেভ করতে সমস্যা হয়েছে।', 'error');
    } finally {
      setIsSavingSite(false);
    }
  };

  const toggleUserBlock = async (userId: string, currentBlockedStatus: boolean) => {
    try {
      const newBlockedStatus = !currentBlockedStatus;
      await updateDoc(doc(db, 'users', userId), { 
        blocked: newBlockedStatus,
        status: newBlockedStatus ? 'blocked' : 'active',
        updatedAt: new Date().toISOString()
      });
      showToast(newBlockedStatus ? 'ইউজারকে ব্লক করা হয়েছে।' : 'ইউজারকে আনব্লক করা হয়েছে।', 'success');
    } catch (err) {
      console.error("Error toggling user block:", err);
      showToast('অ্যাকশন সম্পন্ন করতে সমস্যা হয়েছে।', 'error');
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'ড্যাশবোর্ড', icon: LayoutDashboard },
    { id: 'all-products', label: 'All Product', icon: Package },
    { id: 'product-listing', label: 'Product Listing', icon: Filter },
    { id: 'all-orders', label: 'All Orders', icon: ShoppingCart },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'delivered-orders', label: 'Delivered Orders', icon: Check },
    { id: 'theme', label: 'থিম সেটিংস', icon: Palette },
    { id: 'settings', label: 'সাইট সেটিংস', icon: Settings },
  ];

  const renderDashboard = () => (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-primary to-secondary p-4 rounded-2xl text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-2">আসসালামু আলাইকুম, অ্যাডমিন!</h2>
          <p className="opacity-90">আপনার স্টোরের আজকের সারসংক্ষেপ এখানে দেখুন।</p>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Products', value: stats.products, icon: Package, color: 'bg-blue-500', tab: 'product-listing' },
          { label: 'Pending Orders', value: stats.pending, icon: Clock, color: 'bg-orange-500', tab: 'all-orders' },
          { label: 'Delivered Orders', value: stats.delivered, icon: Check, color: 'bg-emerald-500', tab: 'delivered-orders' },
        ].map((item, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setActiveTab(item.tab)}
            className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center group hover:shadow-lg transition-all cursor-pointer"
          >
            <div className={`${item.color} p-3 rounded-xl text-white mb-3 group-hover:scale-110 transition-transform`}>
              <item.icon className="w-6 h-6" />
            </div>
            <span className="text-3xl font-black text-gray-800 leading-none">{toBanglaNumber(item.value)}</span>
            <span className="text-sm font-bold text-gray-400 uppercase tracking-wider mt-2">{item.label}</span>
          </motion.div>
        ))}
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
          <Info className="text-primary w-6 h-6" />
          Quick Actions
        </h3>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mt-8">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
          <FileText className="text-primary w-6 h-6" />
          Reports
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(['7days', '30days', 'lastMonth', 'all'] as const).map(range => (
            <div key={range} className="p-4 bg-gray-50 rounded-2xl flex flex-col gap-3">
              <span className="font-bold capitalize text-sm text-gray-700">{range.replace(/([A-Z])/g, ' $1')}</span>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => generateReport(range, true)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition text-xs font-bold text-gray-600"
                >
                  Preview
                </button>
                <button 
                  onClick={() => generateReport(range, false)}
                  className="w-full px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition text-xs font-bold"
                >
                  Download PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

// ... in renderDashboard ...
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mt-8">
        <h3 className="text-xl font-bold mb-6">Reports</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {['7days', '30days', 'lastMonth', 'all'].map(range => (
            <div key={range} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
              <span className="font-bold capitalize">{range.replace(/([A-Z])/g, ' $1')}</span>
              <div className="flex gap-2">
                <button onClick={() => generateReport(range as any, true)} className="px-3 py-1 bg-white text-primary text-xs font-bold rounded-lg shadow-sm">Preview</button>
                <button onClick={() => generateReport(range as any, false)} className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-lg shadow-sm">Download PDF</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Preview Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white p-6 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-bold">{selectedReport.title}</h2>
                <p className="text-sm text-gray-500">{selectedReport.dateRange}</p>
              </div>
              <button onClick={() => setSelectedReport(null)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
              <div className="p-3 bg-blue-50 rounded-xl text-center"><p className="text-xs text-gray-500">Products Added</p><p className="font-bold text-lg">{selectedReport.productsAdded}</p></div>
              <div className="p-3 bg-orange-50 rounded-xl text-center"><p className="text-xs text-gray-500">Pending</p><p className="font-bold text-lg">{selectedReport.pending}</p></div>
              <div className="p-3 bg-emerald-50 rounded-xl text-center"><p className="text-xs text-gray-500">Delivered</p><p className="font-bold text-lg">{selectedReport.delivered}</p></div>
            </div>

            {selectedReport.orders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] text-left">
                  <thead className="bg-gray-50 text-gray-500 uppercase">
                    <tr>
                      <th className="px-2 py-2">COUNT</th>
                      <th className="px-2 py-2">NAME</th>
                      <th className="px-2 py-2">NUMBER</th>
                      <th className="px-2 py-2">DATE</th>
                      <th className="px-2 py-2">STATUS</th>
                      <th className="px-2 py-2">PRICE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedReport.orders.map((o: any, i: number) => {
                      const isDelivered = o.status === 'Delivered' || o.status === 'ডেলিভার্ড';
                      const isCancelled = o.status === 'Cancelled' || o.status === 'বাতিল';
                      return (
                        <tr key={i} className={cn(isDelivered ? 'bg-green-50' : isCancelled ? 'bg-red-50' : '')}>
                          <td className="px-2 py-2">{o.count}</td>
                          <td className="px-2 py-2 font-medium">{o.name}</td>
                          <td className="px-2 py-2">{o.number}</td>
                          <td className="px-2 py-2">{o.date}</td>
                          <td className="px-2 py-2 font-bold">{o.status}</td>
                          <td className="px-2 py-2 font-bold text-primary">{o.price}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-10">No data available for this range.</p>
            )}
            
            <button onClick={() => setSelectedReport(null)} className="w-full mt-6 py-2 bg-gray-100 rounded-xl font-bold text-sm hover:bg-gray-200">Close</button>
          </div>
        </div>
      )}


  const renderAllProduct = () => (
    <div className="space-y-8">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-center">
        <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <Package className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-black text-gray-800 mb-2">Total Products</h2>
        <p className="text-5xl font-black text-primary mb-8">{toBanglaNumber(stats.products)}</p>
        <button 
          onClick={() => setActiveTab('product-listing')}
          className="px-10 py-5 bg-primary text-white rounded-3xl font-bold text-lg shadow-xl shadow-primary/30 hover:scale-105 transition-transform flex items-center gap-3 mx-auto"
        >
          <Settings className="w-6 h-6" />
          Manage Products
        </button>
      </div>
    </div>
  );

  const renderProductListing = () => {
    const categories = PRODUCT_CATEGORIES;
    
    const filteredProducts = products.filter(p => {
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      const matchesSearch = p.productName?.toLowerCase().includes(productSearch.toLowerCase()) || false;
      return matchesCategory && matchesSearch;
    });

    return (
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setActiveTab('dashboard')} 
              className="p-1.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <h2 className="text-lg font-bold text-gray-800">Product Listing</h2>
          </div>
          
          <div className="flex items-center gap-2 flex-1 md:max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text"
                placeholder="প্রোডাক্ট খুঁজুন..."
                className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-gray-100 outline-none text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
            </div>
            <button 
              onClick={() => {
                setEditingProductId(null);
                setNewProduct({
                  productName: '',
                  productDescription: '',
                  productPrice: '',
                  discount: '0',
                  stock: '0',
                  category: '',
                  productImage: 'https://picsum.photos/seed/product/400/400',
                  status: 'সক্রিয়'
                });
                setShowAddProduct(true);
              }}
              className="bg-primary text-white px-4 py-2 rounded-xl shadow-sm shadow-primary/20 flex items-center gap-2 font-bold text-sm hover:scale-105 transition-transform shrink-0"
            >
              <Plus className="w-4 h-4" />
              নতুন প্রোডাক্ট
            </button>
          </div>
        </div>

        {/* Category Filters */}
        <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                  selectedCategory === cat 
                    ? "bg-primary text-white shadow-md shadow-primary/20" 
                    : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden w-full max-w-full">
          <div className="overflow-x-auto overflow-y-hidden custom-scrollbar">
            <table className="w-full text-left border-collapse table-fixed">
              <thead className="bg-gray-50 text-[9px] font-bold text-gray-400 uppercase border-b border-gray-100">
                <tr>
                  <th className="px-1 py-2 w-8 text-center">নং</th>
                  <th className="px-1 py-2 w-10">ছবি</th>
                  <th className="px-1 py-2 min-w-[100px]">নাম</th>
                  <th className="px-1 py-2 w-20">মূল্য</th>
                  <th className="px-1 py-2 w-24 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredProducts.map((product, index) => (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-1 py-1 text-[9px] text-gray-400 font-mono text-center">
                      {toBanglaNumber(index + 1)}
                    </td>
                    <td className="px-1 py-1">
                      <div className="w-6 h-6 rounded-md overflow-hidden border border-gray-100 bg-gray-50 flex-shrink-0">
                        <img 
                          src={product.productImage} 
                          className="w-full h-full object-cover" 
                          alt="" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </td>
                    <td className="px-1 py-1">
                      <div className="text-[10px] font-bold text-gray-800 truncate max-w-[100px]" title={product.productName}>
                        {product.productName}
                      </div>
                    </td>
                    <td className="px-1 py-1">
                      <div className="text-[10px] font-bold text-primary">
                        {formatPrice(product.productPrice)}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <div className="flex justify-end gap-1">
                        <button 
                          onClick={() => editProduct(product)}
                          className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded hover:bg-blue-100 transition-colors"
                        >
                          এডিট
                        </button>
                        <button 
                          onClick={() => deleteProduct(product.id)}
                          className="px-2 py-1 bg-red-50 text-red-600 text-[10px] font-bold rounded hover:bg-red-100 transition-colors"
                        >
                          ডিলিট
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredProducts.length === 0 && (
              <div className="p-12 text-center">
                <Package className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-400 text-sm">এই ক্যাটাগরিতে কোনো প্রোডাক্ট পাওয়া যায়নি।</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderOrdersList = (filterType: 'pending' | 'all' | 'delivered') => {
    const filteredOrders = orders.filter(order => {
      const status = order.status?.toLowerCase();
      if (filterType === 'pending') return status === 'pending' || status === 'পেন্ডিং';
      if (filterType === 'all') return status !== 'delivered' && status !== 'ডেলিভার্ড' && status !== 'cancelled' && status !== 'বাতিল';
      if (filterType === 'delivered') return status === 'delivered' || status === 'ডেলিভার্ড';
      return true;
    }).filter(order => 
      order.customerName?.toLowerCase().includes(orderSearch.toLowerCase()) ||
      order.id?.toLowerCase().includes(orderSearch.toLowerCase())
    );

    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-emerald-500" />
            {filterType === 'pending' ? 'Pending Orders' : 
             filterType === 'delivered' ? 'Delivered Orders' : 'All Orders'}
            <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-full ml-2">
              {toBanglaNumber(filteredOrders.length)}
            </span>
          </h2>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search by ID or Name..." 
              className="w-full pl-9 pr-4 py-2 bg-gray-50 rounded-xl border border-gray-100 outline-none text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden w-full max-w-full">
          <div className="overflow-x-auto overflow-y-hidden custom-scrollbar">
            <table className="w-full text-left border-collapse table-fixed">
              <thead className="bg-gray-50 text-[9px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <tr>
                  <th className="px-2 py-2 w-10">নং</th>
                  <th className="px-2 py-2 min-w-[100px]">কাস্টমার</th>
                  <th className="px-2 py-2 w-24">অর্ডার আইডি</th>
                  <th className="px-2 py-2 w-16">ভিউ</th>
                  <th className="px-2 py-2 w-24">স্ট্যাটাস</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((order, index) => (
                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-2 py-1.5 text-[9px] text-gray-500 font-mono">
                        {toBanglaNumber(index + 1)}
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="text-[10px] font-bold text-gray-800 max-w-[120px] truncate" title={order.customerName}>{order.customerName}</div>
                      </td>
                      <td className="px-2 py-1.5 text-[9px] font-mono text-gray-600">
                        #{order.id.slice(-6).toUpperCase()}
                      </td>
                      <td className="px-2 py-1.5">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-md text-[9px] font-bold text-gray-700 transition-all"
                        >
                          ভিউ
                        </button>
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          value={order.status || ''}
                          onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                          className={cn(
                            "px-1 py-0.5 rounded-md text-[8px] font-bold uppercase outline-none border transition-all cursor-pointer w-full",
                            order.status === 'Pending' || order.status === 'পেন্ডিং' ? "bg-orange-50 text-orange-600 border-orange-200" :
                            order.status === 'Delivered' || order.status === 'ডেলিভার্ড' ? "bg-green-50 text-green-600 border-green-200" :
                            order.status === 'Cancelled' || order.status === 'বাতিল' ? "bg-red-50 text-red-600 border-red-200" :
                            "bg-gray-50 text-gray-600 border-gray-200"
                          )}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-16 text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShoppingCart className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-800 font-bold mb-1">No orders found</p>
                      <p className="text-xs text-gray-500">Try adjusting your search query</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Order Details Modal */}
        <AnimatePresence>
          {selectedOrder && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedOrder(null)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white w-[90%] max-w-[600px] rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              >
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 sticky top-0 z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                      <ShoppingCart className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-800">Order Details</h3>
                      <p className="text-[10px] font-mono text-gray-500">#{selectedOrder.id.toUpperCase()}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedOrder(null)}
                    className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-8">
                  
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Customer</p>
                      <p className="text-sm font-bold text-gray-800">{selectedOrder.customerName}</p>
                      <p className="text-xs text-gray-500 mt-1">{selectedOrder.mobile}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Delivery Address</p>
                      <p className="text-xs text-gray-700">{selectedOrder.address}</p>
                    </div>
                    <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Total Amount</p>
                      <p className="text-xl font-black text-emerald-700">{formatPrice(selectedOrder.total)}</p>
                      <p className="text-xs text-emerald-600 mt-1">
                        {toBanglaNumber(selectedOrder.items?.reduce((acc:number, item:any) => acc + item.quantity, 0) || 0)} Items
                      </p>
                    </div>
                  </div>

                  {/* Products List */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-800 mb-4 uppercase tracking-wider flex items-center gap-2">
                      <Package className="w-4 h-4 text-gray-400" />
                      Products
                    </h4>
                    <div className="space-y-3">
                      {selectedOrder.items?.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center gap-4 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                          <div className="flex items-center gap-3">
                            <img 
                              src={item.productImage || 'https://picsum.photos/seed/product/400/400'} 
                              className="w-10 h-10 object-cover rounded-lg border border-gray-100" 
                              alt=""
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <p className="text-xs font-bold text-gray-800">{item.productName}</p>
                              <p className="text-[10px] text-gray-400">{formatPrice(item.productPrice)} x {toBanglaNumber(item.quantity)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-gray-800">{formatPrice(item.productPrice * item.quantity)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Order Timeline */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-800 mb-6 uppercase tracking-wider flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      Order Timeline
                    </h4>
                    <div className="flex flex-col sm:flex-row justify-center gap-12 sm:gap-24 relative max-w-2xl mx-auto bg-gray-50 p-6 rounded-2xl border border-gray-100">
                      {/* Connecting Line */}
                      <div className="hidden sm:block absolute top-10 left-1/4 right-1/4 h-0.5 bg-emerald-200 z-0"></div>
                      
                      {[
                        { step: 'Order Created', date: selectedOrder.createdAt, done: true },
                        { step: 'Delivered', date: selectedOrder.status === 'Delivered' || selectedOrder.status === 'ডেলিভার্ড' ? (selectedOrder.updatedAt || selectedOrder.createdAt) : null, done: selectedOrder.status === 'Delivered' || selectedOrder.status === 'ডেলিভার্ড' }
                      ].map((timeline, idx) => (
                        <div key={idx} className="relative z-10 flex sm:flex-col items-center gap-4 sm:gap-3">
                          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shadow-md shrink-0 border-2 border-white ring-4", timeline.done ? "bg-emerald-500 text-white ring-emerald-50" : "bg-gray-200 text-gray-400 ring-gray-50")}>
                            <Check className="w-4 h-4" />
                          </div>
                          <div className="sm:text-center">
                            <p className="text-[11px] font-bold text-gray-800">{timeline.step}</p>
                            {timeline.date ? (
                              <p className="text-[9px] text-gray-500 mt-1 font-mono">
                                {new Date(timeline.date).toLocaleString('bn-BD', {
                                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                })}
                              </p>
                            ) : (
                              <p className="text-[9px] text-gray-400 mt-1 italic">{timeline.done ? 'Completed' : 'Pending'}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderUsers = () => {
    const filteredUsers = users.filter(u => 
      (u.fullName || u.name || '').toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.mobile || '').includes(userSearch)
    ).sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return dateB.getTime() - dateA.getTime();
    });

    return (
      <div className="space-y-4 w-full max-w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" />
            User Management
            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full ml-2">
              {toBanglaNumber(users.length)}
            </span>
          </h2>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search by Name or Mobile..." 
              className="w-full pl-9 pr-4 py-2 bg-gray-50 rounded-xl border border-gray-100 outline-none text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden w-full max-w-full">
          <div className="overflow-x-auto overflow-y-auto max-h-[600px] custom-scrollbar">
            <table className="w-full min-w-[700px] text-left border-collapse table-fixed">
              <thead className="bg-gray-50 text-[9px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 sticky top-0 z-10">
                <tr className="h-[30px]">
                  <th className="px-2 w-10">নং</th>
                  <th className="px-2 w-[30%]">নাম</th>
                  <th className="px-2 w-[20%]">মোবাইল</th>
                  <th className="px-2 w-[10%]">রোল</th>
                  <th className="px-2 w-[10%]">স্ট্যাটাস</th>
                  <th className="px-2 w-[20%] text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-sm font-medium">
                      No registered users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user, index) => (
                    <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group h-[25px] overflow-hidden">
                      <td className="px-2 text-[9px] text-gray-500 font-mono">
                        {toBanglaNumber(index + 1)}
                      </td>
                      <td className="px-2">
                        <div className="text-[10px] font-bold text-gray-800 truncate" title={user.fullName || user.name || 'N/A'}>
                          {user.fullName || user.name || 'N/A'}
                        </div>
                      </td>
                      <td className="px-2 text-[9px] font-mono text-gray-600 truncate" title={user.mobile || 'N/A'}>
                        {user.mobile || 'N/A'}
                      </td>
                      <td className="px-2 text-[9px] font-bold text-gray-600 uppercase">
                        {user.role || 'N/A'}
                      </td>
                      <td className="px-2">
                        <span className={cn(
                          "px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase",
                          user.blocked ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
                        )}>
                          {user.blocked ? 'ব্লকড' : 'সক্রিয়'}
                        </span>
                      </td>
                      <td className="px-2 text-right flex items-center justify-end gap-1 h-[25px]">
                        <button 
                          onClick={() => setSelectedUser(user)}
                          className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 text-[8px] font-bold transition-all"
                        >
                          ভিউ
                        </button>
                        <button 
                          onClick={() => toggleUserBlock(user.id, user.blocked)}
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[8px] font-bold transition-all",
                            user.blocked ? "bg-green-50 text-green-600 hover:bg-green-100" : "bg-red-50 text-red-600 hover:bg-red-100"
                          )}
                        >
                          {user.blocked ? 'আনব্লক' : 'ব্লক'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderUserDetailModal = () => {
    if (!selectedUser) return null;

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSelectedUser(null)}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white w-[90%] max-w-[500px] rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
            <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-600" />
              ইউজার ডিটেইলস
            </h3>
            <button 
              onClick={() => setSelectedUser(null)}
              className="p-2 bg-white rounded-full text-gray-400 hover:text-gray-600 shadow-sm transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4 shadow-inner">
                <User className="w-12 h-12" />
              </div>
              <h4 className="text-2xl font-black text-gray-900">{selectedUser.fullName || selectedUser.name || 'N/A'}</h4>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mt-1">{selectedUser.role || 'User'}</p>
              <div className={cn(
                "mt-3 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest",
                selectedUser.blocked ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
              )}>
                {selectedUser.blocked ? 'Blocked' : 'Active'}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {[
                { label: 'ইউজার আইডি', value: selectedUser.uid || selectedUser.id, icon: ShieldCheck },
                { label: 'মোবাইল নাম্বার', value: selectedUser.mobile || 'N/A', icon: Phone },
                { label: 'প্রোভাইডার', value: selectedUser.provider || 'N/A', icon: Info },
                { label: 'তৈরি হয়েছে', value: selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleString('bn-BD') : 'N/A', icon: Clock },
                { label: 'সর্বশেষ লগইন', value: selectedUser.lastLoginAt ? new Date(selectedUser.lastLoginAt).toLocaleString('bn-BD') : 'N/A', icon: Clock },
              ].map((item, i) => (
                <div key={i} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-500 shadow-sm">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.label}</p>
                    <p className="text-sm font-bold text-gray-800 break-all">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
            <button 
              onClick={() => {
                toggleUserBlock(selectedUser.id, selectedUser.blocked);
                setSelectedUser(null);
              }}
              className={cn(
                "flex-1 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg",
                selectedUser.blocked ? "bg-emerald-500 text-white hover:bg-emerald-600" : "bg-red-500 text-white hover:bg-red-600"
              )}
            >
              {selectedUser.blocked ? 'আনব্লক করুন' : 'ব্লক করুন'}
            </button>
            <button 
              onClick={() => setSelectedUser(null)}
              className="flex-1 py-4 bg-white border border-gray-200 text-gray-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-50 transition-all"
            >
              বন্ধ করুন
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  const renderDeliveredOrders = () => {
    const deliveredOrders = orders.filter(order => {
      const status = order.status?.toLowerCase();
      return status === 'delivered' || status === 'ডেলিভার্ড';
    }).filter(order => 
      order.customerName?.toLowerCase().includes(orderSearch.toLowerCase()) ||
      order.id?.toLowerCase().includes(orderSearch.toLowerCase())
    );

    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Check className="w-6 h-6 text-emerald-500" />
            Delivered Orders
            <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-full ml-2">
              {toBanglaNumber(deliveredOrders.length)}
            </span>
          </h2>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search by ID or Name..." 
              className="w-full pl-9 pr-4 py-2 bg-gray-50 rounded-xl border border-gray-100 outline-none text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden w-full max-w-full">
          <div className="overflow-x-auto overflow-y-hidden custom-scrollbar">
            <table className="w-full text-left border-collapse table-fixed">
              <thead className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <tr>
                  <th className="px-4 py-2.5 w-24">Order ID</th>
                  <th className="px-4 py-2.5 min-w-[150px]">Customer</th>
                  <th className="px-4 py-2.5 min-w-[200px]">Products</th>
                  <th className="px-4 py-2.5 text-right w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {deliveredOrders.length > 0 ? (
                  deliveredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-4 py-2 text-xs font-mono text-gray-500">
                        #{order.id.slice(-8).toUpperCase()}
                      </td>
                      <td className="px-4 py-2">
                        <div className="text-xs font-bold text-gray-800 max-w-[150px] truncate" title={order.customerName}>{order.customerName}</div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="text-xs text-gray-700 max-w-[200px] truncate" title={order.items?.map((i:any)=>i.productName).join(', ')}>
                          {order.items?.[0]?.productName} {order.items?.length > 1 && <span className="text-emerald-600 font-bold">(+{toBanglaNumber(order.items.length - 1)})</span>}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => setSelectedDeliveredOrder(order)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[11px] font-bold text-gray-600 hover:bg-gray-50 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-16 text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Package className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-800 font-bold mb-1">No delivered orders found</p>
                      <p className="text-xs text-gray-500">Try adjusting your search query</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Delivered Order Details Modal */}
        <AnimatePresence>
          {selectedDeliveredOrder && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedDeliveredOrder(null)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white w-[90%] max-w-[600px] rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              >
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 sticky top-0 z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                      <Check className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-800">Order Details</h3>
                      <p className="text-[10px] font-mono text-gray-500">#{selectedDeliveredOrder.id.toUpperCase()}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedDeliveredOrder(null)}
                    className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-8">
                  
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Customer</p>
                      <p className="text-sm font-bold text-gray-800">{selectedDeliveredOrder.customerName}</p>
                      <p className="text-xs text-gray-500 mt-1">{selectedDeliveredOrder.mobile}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Delivery Address</p>
                      <p className="text-xs text-gray-700">{selectedDeliveredOrder.address}</p>
                    </div>
                    <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Total Amount</p>
                      <p className="text-xl font-black text-emerald-700">{formatPrice(selectedDeliveredOrder.total)}</p>
                      <p className="text-xs text-emerald-600 mt-1">
                        {toBanglaNumber(selectedDeliveredOrder.items?.reduce((acc:number, item:any) => acc + item.quantity, 0) || 0)} Items
                      </p>
                    </div>
                  </div>

                  {/* Products List */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-800 mb-4 uppercase tracking-wider flex items-center gap-2">
                      <Package className="w-4 h-4 text-gray-400" />
                      Products
                    </h4>
                    <div className="space-y-3">
                      {selectedDeliveredOrder.items?.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center gap-4 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                          <div className="flex items-center gap-3">
                            <img 
                              src={item.productImage || 'https://picsum.photos/seed/product/400/400'} 
                              className="w-10 h-10 object-cover rounded-lg border border-gray-100" 
                              alt=""
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <p className="text-xs font-bold text-gray-800">{item.productName}</p>
                              <p className="text-[10px] text-gray-400">{formatPrice(item.productPrice)} x {toBanglaNumber(item.quantity)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-gray-800">{formatPrice(item.productPrice * item.quantity)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Order Timeline */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-800 mb-6 uppercase tracking-wider flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      Order Timeline
                    </h4>
                    <div className="flex flex-col sm:flex-row justify-center gap-12 sm:gap-24 relative max-w-2xl mx-auto bg-gray-50 p-6 rounded-2xl border border-gray-100">
                      {/* Connecting Line */}
                      <div className="hidden sm:block absolute top-10 left-1/4 right-1/4 h-0.5 bg-emerald-200 z-0"></div>
                      
                      {[
                        { step: 'Order Created', date: selectedDeliveredOrder.createdAt, done: true },
                        { step: 'Delivered', date: selectedDeliveredOrder.updatedAt || selectedDeliveredOrder.createdAt, done: true }
                      ].map((timeline, idx) => (
                        <div key={idx} className="relative z-10 flex sm:flex-col items-center gap-4 sm:gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md shrink-0 border-2 border-white ring-4 ring-emerald-50">
                            <Check className="w-4 h-4" />
                          </div>
                          <div className="sm:text-center">
                            <p className="text-[11px] font-bold text-gray-800">{timeline.step}</p>
                            {timeline.date ? (
                              <p className="text-[9px] text-gray-500 mt-1 font-mono">
                                {new Date(timeline.date).toLocaleString('bn-BD', {
                                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                })}
                              </p>
                            ) : (
                              <p className="text-[9px] text-gray-400 mt-1 italic">Completed</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderTheme = () => (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-2xl font-bold text-gray-800">থিম / কালার সেটিংস</h2>
        </div>
      </div>
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label: 'প্রাইমারি কালার', key: 'primaryColor', desc: 'বাটন এবং হাইলাইটের জন্য' },
          { label: 'সেকেন্ডারি কালার', key: 'secondaryColor', desc: 'হেডার এবং কার্ডের জন্য' },
          { label: 'হেডার কালার', key: 'headerColor', desc: 'উপরের নেভিগেশন বারের জন্য' },
          { label: 'হেডার টেক্সট কালার', key: 'headerTextColor', desc: 'হেডার টেক্সটের জন্য' },
          { label: 'বাটন কালার', key: 'buttonColor', desc: 'অ্যাকশন বাটনের জন্য' },
          { label: 'বাটন টেক্সট কালার', key: 'buttonTextColor', desc: 'বাটন টেক্সটের জন্য' },
          { label: 'কার্ড কালার', key: 'cardColor', desc: 'কন্টেন্ট কার্ডের জন্য' },
          { label: 'কার্ড টেক্সট কালার', key: 'cardTextColor', desc: 'কার্ড টেক্সটের জন্য' },
          { label: 'ব্যাকগ্রাউন্ড কালার', key: 'bgColor', desc: 'পুরো সাইটের ব্যাকগ্রাউন্ড' },
          { label: 'সেকশন ব্যাকগ্রাউন্ড', key: 'sectionBgColor', desc: 'সেকশন ব্যাকগ্রাউন্ডের জন্য' },
          { label: 'বর্ডার কালার', key: 'borderColor', desc: 'বর্ডারের জন্য' },
          { label: 'টাইটেল কালার', key: 'titleColor', desc: 'টাইটেলের জন্য' },
          { label: 'সাবটাইটেল কালার', key: 'subtitleColor', desc: 'সাবটাইটেলের জন্য' },
          { label: 'লিঙ্ক কালার', key: 'linkColor', desc: 'লিঙ্কের জন্য' },
          { label: 'আইকন কালার', key: 'iconColor', desc: 'আইকনের জন্য' },
          { label: 'টেবিল হেডার কালার', key: 'tableHeaderColor', desc: 'টেবিল হেডারের জন্য' },
          { label: 'টেবিল রো কালার', key: 'tableRowColor', desc: 'টেবিল রোর জন্য' },
          { label: 'ইনপুট ব্যাকগ্রাউন্ড', key: 'inputBgColor', desc: 'ইনপুট ফিল্ড ব্যাকগ্রাউন্ড' },
          { label: 'ইনপুট টেক্সট কালার', key: 'inputTextColor', desc: 'ইনপুট ফিল্ড টেক্সট' },
          { label: 'সাইডবার কালার', key: 'sidebarColor', desc: 'সাইডবারের জন্য' },
          { label: 'সাইডবার টেক্সট কালার', key: 'sidebarTextColor', desc: 'সাইডবার টেক্সটের জন্য' },
        ].map((item) => (
          <div key={item.key} className="flex items-center justify-between p-6 bg-gray-50 rounded-3xl border border-gray-100">
            <div>
              <p className="font-bold text-gray-800">{item.label}</p>
              <p className="text-[10px] text-gray-400">{item.desc}</p>
            </div>
            <div className="flex items-center gap-3">
              <input 
                type="text"
                className="w-24 p-2 rounded-lg border border-gray-200 text-sm font-mono"
                value={themeSettings[item.key] || '#000000'}
                onChange={(e) => updateTheme(item.key, e.target.value)}
              />
              <input 
                type="color" 
                className="w-14 h-14 rounded-2xl border-none cursor-pointer shadow-lg"
                value={themeSettings[item.key] || '#000000'}
                onChange={(e) => updateTheme(item.key, e.target.value)}
              />
            </div>
          </div>
        ))}
        <div className="md:col-span-2 pt-6">
          <button 
            type="button"
            onClick={saveThemeSettings}
            disabled={isSavingTheme}
            className="w-full py-5 bg-primary text-white rounded-3xl font-bold text-lg shadow-xl shadow-primary/30 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSavingTheme ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" /> সেভ হচ্ছে...
              </>
            ) : (
              <>
                <Save className="w-6 h-6" /> থিম সেটিংস সেভ করুন
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const renderSiteSettings = () => (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <button 
          onClick={() => setActiveTab('dashboard')} 
          className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-2xl font-bold text-gray-800">সাইট সেটিংস</h2>
      </div>
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <form className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase ml-2 mb-2 block">সাইটের নাম</label>
              <input 
                type="text" 
                placeholder="যেমন: আমার ই-কমার্স" 
                className="w-full p-4 bg-gray-50 rounded-2xl outline-none border border-gray-100 focus:ring-2 focus:ring-primary/20"
                value={siteSettings.siteName || ''}
                onChange={e => updateSiteSettings('siteName', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase ml-2 mb-2 block">সাপোর্ট নাম্বার</label>
              <input 
                type="text" 
                placeholder="যেমন: 01xxxxxxxxx" 
                className="w-full p-4 bg-gray-50 rounded-2xl outline-none border border-gray-100 focus:ring-2 focus:ring-primary/20"
                value={siteSettings.supportNumber || ''}
                onChange={e => updateSiteSettings('supportNumber', e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-gray-400 uppercase ml-2 mb-2 block">ব্যানার টেক্সট</label>
              <input 
                type="text" 
                placeholder="যেমন: ঈদ উপলক্ষে সকল পণ্যে ৫০% ছাড়!" 
                className="w-full p-4 bg-gray-50 rounded-2xl outline-none border border-gray-100 focus:ring-2 focus:ring-primary/20"
                value={siteSettings.bannerText || ''}
                onChange={e => updateSiteSettings('bannerText', e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-gray-400 uppercase ml-2 mb-2 block">যোগাযোগের ঠিকানা</label>
              <textarea 
                placeholder="আপনার অফিসের বা দোকানের ঠিকানা" 
                className="w-full p-4 bg-gray-50 rounded-2xl outline-none border border-gray-100 h-24 focus:ring-2 focus:ring-primary/20"
                value={siteSettings.contactInfo || ''}
                onChange={e => updateSiteSettings('contactInfo', e.target.value)}
              />
            </div>
          </div>
          <button 
            type="button" 
            onClick={saveSiteSettings}
            disabled={isSavingSite}
            className="w-full py-5 bg-secondary text-white rounded-3xl font-bold text-lg shadow-xl shadow-secondary/30 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSavingSite ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" /> সেভ হচ্ছে...
              </>
            ) : (
              <>
                <Save className="w-6 h-6" /> সাইট সেটিংস সেভ করুন
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white p-3 sticky top-0 z-[60] shadow-sm flex justify-between items-center border-b border-gray-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-secondary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-secondary/30">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-black text-secondary leading-none">অ্যাডমিন প্যানেল</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">ম্যানেজমেন্ট ড্যাশবোর্ড</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-3 bg-gray-50 rounded-2xl text-secondary hover:bg-secondary hover:text-white transition-all relative"
          >
            <Bell className="w-6 h-6" />
            {stats.newNotifs > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                {toBanglaNumber(stats.newNotifs)}
              </span>
            )}
          </button>
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="p-3 bg-gray-50 rounded-2xl text-secondary hover:bg-secondary hover:text-white transition-all"
          >
            {showMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Menu Overlay */}
      <AnimatePresence>
        {showMenu && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMenu(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-64 bg-white z-[80] shadow-2xl flex flex-col"
            >
              <div className="p-4 flex flex-col h-full">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-secondary">মেনু</h3>
                  <button onClick={() => setShowMenu(false)} className="p-2 bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
                </div>
                <nav className="flex-1 space-y-2">
                  {menuItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => { setActiveTab(item.id); setShowMenu(false); }}
                      className={cn(
                        "w-full p-5 rounded-3xl flex items-center gap-4 font-bold transition-all",
                        activeTab === item.id 
                          ? "bg-primary text-white shadow-xl shadow-primary/30 scale-[1.02]" 
                          : "text-gray-400 hover:bg-gray-50 hover:text-secondary"
                      )}
                    >
                      <item.icon className="w-6 h-6" />
                      {item.label}
                    </button>
                  ))}
                </nav>
                <button 
                  onClick={() => {
                    logoutAdmin();
                    auth.signOut();
                  }}
                  className="mt-auto w-full p-5 bg-red-50 text-red-500 rounded-3xl flex items-center gap-4 font-bold hover:bg-red-500 hover:text-white transition-all"
                >
                  <LogOut className="w-6 h-6" /> লগআউট
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Notifications Modal */}
      <AnimatePresence>
        {showNotifications && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNotifications(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-96 bg-white z-[80] shadow-2xl flex flex-col"
            >
              <div className="p-6 flex flex-col h-full">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-secondary">নোটিফিকেশন</h3>
                  <button onClick={() => setShowNotifications(false)} className="p-2 bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                  {notifications.length > 0 ? (
                    notifications.map((notif: any) => (
                      <div 
                        key={notif.id} 
                        onClick={() => !notif.isRead && markAsRead(notif.id)}
                        className={cn("p-4 rounded-2xl border shadow-sm cursor-pointer transition-colors", notif.isRead ? "bg-white border-gray-100 opacity-70" : "bg-emerald-50 border-emerald-100")}
                      >
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <p className={cn("text-xs font-bold", notif.isRead ? "text-gray-600" : "text-gray-800")}>{notif.title}</p>
                          {notif.isRead && <CheckCircle className="w-3 h-3 text-green-500 shrink-0 mt-0.5" />}
                        </div>
                        <p className={cn("text-[11px] mb-2", notif.isRead ? "text-gray-500" : "text-gray-600")}>{notif.message}</p>
                        <p className="text-[9px] text-gray-400 font-mono">
                          {(() => {
                            const d = notif.createdAt?.toDate ? notif.createdAt.toDate() : new Date(notif.createdAt);
                            return d.toLocaleString('bn-BD');
                          })()}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-400 text-sm py-10">কোনো নতুন নোটিফিকেশন নেই</p>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add/Edit Product Modal */}
      <AnimatePresence>
        {showAddProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            {/* Overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            {/* Modal Content */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-[90%] max-w-[600px] rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                    <Plus className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-black text-gray-800">
                    {editingProductId ? 'প্রোডাক্ট এডিট করুন' : 'নতুন প্রোডাক্ট যোগ করুন'}
                  </h3>
                </div>
                <button 
                  onClick={() => setShowAddProduct(false)}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Form Body */}
              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                <form id="productForm" onSubmit={handleAddProduct} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Product Name */}
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-1.5 block">প্রোডাক্টের নাম</label>
                      <input 
                        required
                        type="text" 
                        placeholder="যেমন: প্রিমিয়াম কটন টি-শার্ট" 
                        className="w-full px-4 py-3 bg-gray-50 rounded-2xl outline-none border border-gray-100 focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
                        value={newProduct.productName || ''}
                        onChange={e => setNewProduct({...newProduct, productName: e.target.value})}
                      />
                    </div>

                    {/* Price & Discount */}
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-1.5 block">মূল্য (টাকা)</label>
                      <input 
                        required
                        type="number" 
                        placeholder="0.00" 
                        className="w-full px-4 py-3 bg-gray-50 rounded-2xl outline-none border border-gray-100 focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
                        value={newProduct.productPrice || ''}
                        onChange={e => setNewProduct({...newProduct, productPrice: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-1.5 block">ডিসকাউন্ট (%)</label>
                      <input 
                        type="number" 
                        placeholder="0" 
                        className="w-full px-4 py-3 bg-gray-50 rounded-2xl outline-none border border-gray-100 focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
                        value={newProduct.discount || ''}
                        onChange={e => setNewProduct({...newProduct, discount: e.target.value})}
                      />
                    </div>

                    {/* Stock & Category */}
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-1.5 block">স্টক পরিমাণ</label>
                      <input 
                        required
                        type="number" 
                        placeholder="যেমন: ৫০" 
                        className="w-full px-4 py-3 bg-gray-50 rounded-2xl outline-none border border-gray-100 focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
                        value={newProduct.stock || ''}
                        onChange={e => setNewProduct({...newProduct, stock: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-1.5 block">ক্যাটাগরি</label>
                      <select 
                        required
                        className="w-full px-4 py-3 bg-gray-50 rounded-2xl outline-none border border-gray-100 focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium appearance-none"
                        value={newProduct.category || ''}
                        onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                      >
                        <option value="">নির্বাচন করুন</option>
                        {PRODUCT_CATEGORIES.filter(cat => cat !== 'All').map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    {/* Description */}
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-1.5 block">বিস্তারিত বর্ণনা</label>
                      <textarea 
                        required
                        placeholder="প্রোডাক্ট সম্পর্কে বিস্তারিত লিখুন..." 
                        className="w-full px-4 py-3 bg-gray-50 rounded-2xl outline-none border border-gray-100 focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium h-32 resize-none"
                        value={newProduct.productDescription || ''}
                        onChange={e => setNewProduct({...newProduct, productDescription: e.target.value})}
                      />
                    </div>

                    {/* Image Upload */}
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-1.5 block">প্রোডাক্টের ছবি</label>
                      <div className="flex items-center gap-4">
                        {newProduct.productImage && !newProduct.productImage.includes('picsum.photos') && (
                          <div className="w-16 h-16 rounded-xl border border-gray-100 bg-white overflow-hidden shrink-0 shadow-sm">
                            <img 
                              src={newProduct.productImage} 
                              className="w-full h-full object-cover" 
                              alt="Preview" 
                            />
                          </div>
                        )}
                        <label className="flex-1 flex items-center justify-center gap-2 px-4 py-4 bg-gray-50 hover:bg-gray-100 rounded-2xl border-2 border-dashed border-gray-200 cursor-pointer transition-all text-sm font-bold text-gray-500 hover:text-primary hover:border-primary/30">
                          <ImageIcon className="w-5 h-5" />
                          <span>ডিভাইস থেকে ছবি আপলোড করুন</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setNewProduct({ ...newProduct, productImage: reader.result as string });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </form>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex gap-3 sticky bottom-0 z-10">
                <button 
                  type="button"
                  onClick={() => setShowAddProduct(false)}
                  className="flex-1 py-3.5 bg-white text-gray-600 rounded-2xl font-bold text-sm border border-gray-200 hover:bg-gray-100 transition-all"
                >
                  বাতিল করুন
                </button>
                <button 
                  type="submit"
                  form="productForm"
                  className="flex-[2] py-3.5 bg-primary text-white rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingProductId ? 'আপডেট করুন' : 'প্রোডাক্ট যোগ করুন'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedUser && renderUserDetailModal()}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 p-2 lg:p-4 w-full max-w-full overflow-x-hidden transition-all duration-300">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'all-products' && renderAllProduct()}
            {activeTab === 'product-listing' && renderProductListing()}
            {activeTab === 'all-orders' && renderOrdersList('all')}
            {activeTab === 'users' && renderUsers()}
            {activeTab === 'delivered-orders' && renderDeliveredOrders()}
            {activeTab === 'theme' && renderTheme()}
            {activeTab === 'settings' && renderSiteSettings()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
