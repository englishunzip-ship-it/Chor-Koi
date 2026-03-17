import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCoN35Kx6hZO-yVPIO8X-BF5zZbvwP5XaM",
  authDomain: "chor-koi.firebaseapp.com",
  projectId: "chor-koi",
  storageBucket: "chor-koi.firebasestorage.app",
  messagingSenderId: "958359114428",
  appId: "1:958359114428:web:024900d930fdf13e1876b9"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
