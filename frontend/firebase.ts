import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyDGmmQXPMfKztquFjpQqmVaiIR_CXoa1N8",
  authDomain: "plus500marketingvoe.firebaseapp.com",
  projectId: "plus500marketingvoe",
  storageBucket: "plus500marketingvoe.firebasestorage.app",
  messagingSenderId: "912950288864",
  appId: "1:912950288864:web:d3b7358cd7c2acec954b85"
};

export let app: any = null;
export let auth: any = null;
export let db: any = null;
export let googleProvider: any = null;
export let isFirebaseConfigured = false;

try {
  if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY") {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
    
    // Force account selection to help with sandbox auth state issues
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });

    isFirebaseConfigured = true;
  }
} catch (error) {
  console.error("Firebase initialization error:", error);
  isFirebaseConfigured = false;
}
