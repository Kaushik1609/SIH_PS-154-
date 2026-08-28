// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDummyKeyForDevelopment123456789";

const firebaseConfig = {
  apiKey,
  authDomain: "cortexai-172f9.firebaseapp.com",
  projectId: "cortexai-172f9",
  storageBucket: "cortexai-172f9.firebasestorage.app",
  messagingSenderId: "428104212065",
  appId: "1:428104212065:web:7948e58a8bb47cda0d1420"
};

let app = null;
let auth = null;
let googleProvider = null;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
} catch (err) {
  console.warn("[Firebase] Initialization notice:", err.message);
}

export { auth, googleProvider, app };