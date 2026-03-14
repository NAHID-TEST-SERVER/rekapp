import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBnynqVU2DbbwvUVygRxal1nF6PDwDWErk",
  authDomain: "rek-server-7f477.firebaseapp.com",
  projectId: "rek-server-7f477",
  storageBucket: "rek-server-7f477.firebasestorage.app",
  messagingSenderId: "881458843105",
  appId: "1:881458843105:web:75a9462c71f299df2a16a0",
  measurementId: "G-6TZFFWFVQV",
  databaseURL: "https://rek-server-7f477-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
export const rtdb = getDatabase(app);
export const storage = getStorage(app);
export default app;
