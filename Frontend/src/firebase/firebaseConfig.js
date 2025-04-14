// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyCLzj4gIn55Z436sCy8fdI2qMx8ljUCNfc",
  authDomain: "cloneit-f1199.firebaseapp.com",
  projectId: "cloneit-f1199",
  storageBucket: "cloneit-f1199.appspot.com",
  messagingSenderId: "166951163589",
  appId: "1:166951163589:web:abcdef123456"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app); 