import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDI4Yi0lJsaBq_mTpj8N3-32QfEaDz1100",
  authDomain: "pdamseruyan23.firebaseapp.com",
  projectId: "pdamseruyan23",
  storageBucket: "pdamseruyan23.firebasestorage.app",
  messagingSenderId: "476401203521",
  appId: "1:476401203521:web:db8ed451711098e62889c0",
  measurementId: "G-1KHMMZ5ZTZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export default app;
