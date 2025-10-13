import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';


const firebaseConfig = {
  apiKey: "AIzaSyAVucaYXOXoE6KpO-y_zNDZIylB_XivtQQ",
  authDomain: "smartslide-aaa89.firebaseapp.com",
  projectId: "smartslide-aaa89",
  storageBucket: "smartslide-aaa89.firebasestorage.app",
  messagingSenderId: "792488000354",
  appId: "1:792488000354:web:6e17583816878a312b8a3b",
  measurementId: "G-4TWHQY610S"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

auth.languageCode = 'en'; 

export default app;