import { initializeApp } from 'firebase/app';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot
} from 'firebase/firestore';

// Web App Configuration for project: tour-26
const firebaseConfig = {
  projectId: "tour-26",
  appId: "1:26498265392:web:4eaafbc9b78555460e98f5",
  storageBucket: "tour-26.firebasestorage.app",
  apiKey: "AIzaSyCIsWboX0vH24ZWhRwbqfuSYIohAfPuySU",
  authDomain: "tour-26.firebaseapp.com",
  messagingSenderId: "26498265392",
  measurementId: "G-FRCXW60X3W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

import { setDriveAccessToken } from './services/googleDriveService';

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});
// Request permission to create and upload backup files to Google Drive
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');

// Initialize Firestore
export const db = getFirestore(app);

// Authentication Helpers
export const signInWithGoogle = async () => {
  try {
    if (Capacitor.isNativePlatform()) {
      // Native Android / iOS sign-in using Google Play Services / Credential Manager
      const result = await FirebaseAuthentication.signInWithGoogle();
      const idToken = result.credential?.idToken;
      if (idToken) {
        const credential = GoogleAuthProvider.credential(idToken);
        const userCredential = await signInWithCredential(auth, credential);
        return userCredential.user;
      }
      if (result.user) {
        return result.user;
      }
      throw new Error('গুগল অ্যাকাউন্ট থেকে কোনো ক্রেডেনশিয়াল পাওয়া যায়নি');
    } else {
      // Web browser sign-in using popup
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setDriveAccessToken(credential.accessToken);
      }
      return result.user;
    }
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
};

// Re-authorize or connect Google Drive explicitly
export const connectGoogleDrive = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      setDriveAccessToken(credential.accessToken);
      return { success: true, accessToken: credential.accessToken };
    }
    return { success: false, error: 'No token returned' };
  } catch (error) {
    console.error('Google Drive Auth Error:', error);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    setDriveAccessToken(null);
    if (Capacitor.isNativePlatform()) {
      try {
        await FirebaseAuthentication.signOut();
      } catch {}
    }
    await signOut(auth);
  } catch (error) {
    console.error('Logout Error:', error);
    throw error;
  }
};

// Firestore Realtime Subscription for Family Tour
export const subscribeToTourData = (onDataReceived, onError) => {
  const tourDocRef = doc(db, 'tours', 'coxsbazar2026');
  return onSnapshot(
    tourDocRef,
    (docSnap) => {
      if (docSnap.exists()) {
        onDataReceived(docSnap.data());
      } else {
        // Document doesn't exist yet in Firestore
        onDataReceived(null);
      }
    },
    (err) => {
      console.warn('Firestore subscription error (might need sign-in or offline):', err);
      if (onError) onError(err);
    }
  );
};

import { sanitizeAndCompressTourData } from './utils/imageCompressor';

// Push tour updates to Firestore (with automatic image compression and 1MB size guard)
export const pushTourDataToFirestore = async (data, currentUser) => {
  try {
    const tourDocRef = doc(db, 'tours', 'coxsbazar2026');

    // 1. Automatically downscale and compress any large base64 images in posts/profiles
    const sanitizedData = await sanitizeAndCompressTourData(data);

    const payload = {
      ...sanitizedData,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser ? {
        uid: currentUser.uid,
        name: currentUser.displayName || 'পরিবারের সদস্য',
        email: currentUser.email,
        photoURL: currentUser.photoURL || null
      } : null
    };

    // 2. Safety check: ensure JSON payload size is well below 1MB (1,048,576 bytes)
    const jsonStr = JSON.stringify(payload);
    if (jsonStr.length > 950000) {
      console.warn(`Payload size (${jsonStr.length} bytes) is approaching 1MB limit. Trimming older posts.`);
      // Retain the latest 15 posts to stay safely within limits
      if (Array.isArray(payload.posts) && payload.posts.length > 15) {
        payload.posts = payload.posts.slice(0, 15);
      }
    }

    await setDoc(tourDocRef, payload, { merge: true });
    return true;
  } catch (error) {
    console.error('Error writing to Firestore:', error);
    throw error;
  }
};

export default app;
