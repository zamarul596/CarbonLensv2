// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, clearIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCMObD68aNdIIG9N5PAWfXwi21jkbh743I",
  authDomain: "carbonlens-32147.firebaseapp.com",
  projectId: "carbonlens-32147",
  storageBucket: "carbonlens-32147.firebasestorage.app",
  messagingSenderId: "403682420630",
  appId: "1:403682420630:web:c921bbf99645067bfe9fb7",
  measurementId: "G-TMWZQW71QL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics in production only
let analytics = null;
if (process.env.NODE_ENV === 'production') {
  analytics = getAnalytics(app);
}

// Initialize Auth and Storage
const auth = getAuth(app);
const storage = getStorage(app);

// Initialize Firestore with new cache settings
const db = initializeFirestore(app, {
  cacheSizeBytes: 50 * 1024 * 1024, // 50MB cache size
  experimentalForceLongPolling: true, // Better for some network conditions
  useFetchStreams: false, // Disable for better compatibility
});

// Utility function to clear Firebase cache manually
export const clearFirebaseCache = async () => {
  try {
    await clearIndexedDbPersistence(db);
    console.log('Firebase cache cleared successfully');
    return true;
  } catch (error) {
    console.error('Failed to clear Firebase cache:', error);
    return false;
  }
};

// Debug logging for Auth state changes
auth.onAuthStateChanged((user) => {
  console.log('Auth state changed:', user ? `User ${user.uid} signed in` : 'User signed out');
});

export { auth, db, storage };