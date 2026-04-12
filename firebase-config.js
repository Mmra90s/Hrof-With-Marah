// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCJryCJ50khZKLczrs8pTHVBn7AYqWZt-o",
  authDomain: "hrof-with-marah.firebaseapp.com",
  databaseURL: "https://hrof-with-marah-default-rtdb.firebaseio.com",
  projectId: "hrof-with-marah",
  storageBucket: "hrof-with-marah.firebasestorage.app",
  messagingSenderId: "935326971899",
  appId: "1:935326971899:web:ea3a0e77e30a9c48923d5e",
  measurementId: "G-9WZ1GSGC79"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
