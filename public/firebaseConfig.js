// Import the functions you need from the SDKs you need
// import { initializeApp } from "./__/firebase/app";
// import { getAnalytics } from "./__/firebase/analytics"; 
// import { getFirestore } from "./__/firebase/firestore";
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";


// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAhUAaEU2vCHzQz_NhUnNtJkGzDwIRZ1ts",
  authDomain: "cs222-billsplitter.firebaseapp.com",
  projectId: "cs222-billsplitter",
  storageBucket: "cs222-billsplitter.firebasestorage.app",
  messagingSenderId: "844280482186",
  appId: "1:844280482186:web:401546dd3ae2a35fbca073",
  measurementId: "G-D453TN7056"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);
const db = getFirestore(app);

export {db};