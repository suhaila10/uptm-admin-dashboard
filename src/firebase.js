// src/firebase.js - CLEAN VERSION
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBlWoHvzvZTKktBxaeCBOEn8b04bGPxSxQ",
  authDomain: "uptm-digital-event-535bb.firebaseapp.com",
  projectId: "uptm-digital-event-535bb",
  storageBucket: "uptm-digital-event-535bb.firebasestorage.app",
  messagingSenderId: "580334388654",
  appId: "1:580334388654:web:a067571894eb566140743f",
  measurementId: "G-GJ1X4WYPLL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export const storage = getStorage(app); 

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
  } else if (err.code === 'unimplemented') {
    console.warn('The current browser does not support all of the features required to enable persistence.');
  }
});