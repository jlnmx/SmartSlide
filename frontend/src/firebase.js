import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Your Firebase configuration
// Replace these with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyAVucaYXOXoE6KpO-y_zNDZIylB_XivtQQ",
  authDomain: "smartslide-aaa89.firebaseapp.com",
  projectId: "smartslide-aaa89",
  storageBucket: "smartslide-aaa89.firebasestorage.app",
  messagingSenderId: "792488000354",
  appId: "1:792488000354:web:6e17583816878a312b8a3b",
  measurementId: "G-4TWHQY610S"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Set language code for SMS verification
auth.languageCode = 'en'; // or 'it' for Italian
// To apply the default browser preference instead of explicitly setting it:
// auth.useDeviceLanguage();

export default app;