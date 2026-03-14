import { collection, addDoc, getDocs, query, updateDoc, doc } from 'firebase/firestore';
import { ref, get, update as rtdbUpdate } from 'firebase/database';
import { db, rtdb } from '../firebase';
import { PRODUCT_CATEGORIES } from '../constants';

const NEW_CATEGORIES = PRODUCT_CATEGORIES.filter(cat => cat !== 'All');

export const initializeCategories = async () => {
  const categoriesRef = collection(db, 'categories');
  const snapshot = await getDocs(query(categoriesRef));
  
  if (snapshot.empty) {
    for (const cat of NEW_CATEGORIES) {
      await addDoc(categoriesRef, { name: cat, createdAt: new Date().toISOString() });
    }
  }
};

export const migrateProducts = async () => {
  // Firestore migration
  const productsRef = collection(db, 'products');
  const snapshot = await getDocs(query(productsRef));
  
  const OLD_TO_NEW_MAP: any = {
    'মোবাইল': 'মোবাইল',
  };

  for (const productDoc of snapshot.docs) {
    const product = productDoc.data();
    if (product.category && !NEW_CATEGORIES.includes(product.category)) {
      const newCategory = OLD_TO_NEW_MAP[product.category] || 'কুকওয়্যার';
      await updateDoc(doc(db, 'products', productDoc.id), { category: newCategory });
    }
  }

  // RTDB migration
  const rtdbProductsRef = ref(rtdb, 'products');
  const rtdbSnapshot = await get(rtdbProductsRef);
  if (rtdbSnapshot.exists()) {
    const products = rtdbSnapshot.val();
    for (const id in products) {
      const product = products[id];
      if (product.category && !NEW_CATEGORIES.includes(product.category)) {
        const newCategory = OLD_TO_NEW_MAP[product.category] || 'কুকওয়্যার';
        await rtdbUpdate(ref(rtdb, `products/${id}`), { category: newCategory });
      }
    }
  }
};
