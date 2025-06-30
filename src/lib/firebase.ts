
// Import the functions you need from the SDKs you need
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration from the user
const firebaseConfig = {
  apiKey: "AIzaSyCDfN3WbzBxgWIKS5T9McsC0mRG3pTwTGw",
  authDomain: "kartu-cc.firebaseapp.com",
  projectId: "kartu-cc",
  storageBucket: "kartu-cc.appspot.com",
  messagingSenderId: "1065960118069",
  appId: "1:1065960118069:web:2e6312141c9e37cb06de7c",
  measurementId: "G-D9FQ9TJB8G"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

// Initialize Analytics on the client side
if (typeof window !== 'undefined') {
    isSupported().then(yes => yes ? getAnalytics(app) : null);
}

export { db, auth };
