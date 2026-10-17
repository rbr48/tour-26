import { initializeApp } from 'firebase/app';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  signOut,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { setDriveAccessToken } from './services/googleDriveService';

// Web App Configuration for project: tour-26 (public identifiers, not secrets;
// access is controlled by the Firestore rules and the family allowlist).
const firebaseConfig = {
  projectId: 'tour-26',
  appId: '1:26498265392:web:4eaafbc9b78555460e98f5',
  storageBucket: 'tour-26.firebasestorage.app',
  apiKey: 'AIzaSyCIsWboX0vH24ZWhRwbqfuSYIohAfPuySU',
  authDomain: 'tour-26.firebaseapp.com',
  messagingSenderId: '26498265392',
  measurementId: 'G-FRCXW60X3W',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Dedicated provider for optional Google Drive connection in InstagramFeed
export const driveProvider = new GoogleAuthProvider();
driveProvider.setCustomParameters({
  prompt: 'select_account',
});
driveProvider.addScope('https://www.googleapis.com/auth/drive.file');

function createFirestore(firebaseApp) {
  // Persist the cache in IndexedDB so offline edits survive a reload. Fall back to
  // the in-memory cache where IndexedDB does not exist.
  if (typeof indexedDB === 'undefined') {
    return getFirestore(firebaseApp);
  }
  try {
    return initializeFirestore(firebaseApp, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    return getFirestore(firebaseApp);
  }
}

export const db = createFirestore(app);

export const signInWithGoogle = async () => {
  try {
    if (Capacitor.isNativePlatform()) {
      // Native Android sign-in through Google Play Services / Credential Manager.
      let result;
      try {
        result = await FirebaseAuthentication.signInWithGoogle({
          useCredentialManager: true,
        });
      } catch (err1) {
        console.warn('Native Google Sign-In with CredentialManager failed, falling back to GoogleSignInClient:', err1);
        result = await FirebaseAuthentication.signInWithGoogle({
          useCredentialManager: false,
        });
      }

      let idToken = result?.credential?.idToken || result?.idToken;
      if (!idToken) {
        try {
          const tokenRes = await FirebaseAuthentication.getIdToken();
          idToken = tokenRes?.token;
        } catch (tokenErr) {
          console.warn('Failed to retrieve token from FirebaseAuthentication plugin:', tokenErr);
        }
      }

      if (idToken) {
        const credential = GoogleAuthProvider.credential(idToken);
        const userCredential = await signInWithCredential(auth, credential);
        return userCredential.user;
      }
      if (result?.user) {
        return result.user;
      }
      throw new Error('গুগল অ্যাকাউন্ট থেকে কোনো ক্রেডেনশিয়াল পাওয়া যায়নি');
    }

    // Web platform: standard popup sign-in without sensitive scopes
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
};

// Re-authorize or connect Google Drive explicitly in InstagramFeed when uploading.
export const connectGoogleDrive = async () => {
  try {
    const result = await signInWithPopup(auth, driveProvider);
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
  setDriveAccessToken(null);
  if (Capacitor.isNativePlatform()) {
    try {
      await FirebaseAuthentication.signOut();
    } catch {
      // Native session may already be gone; the Firebase sign-out below is what matters.
    }
  }
  await signOut(auth);
};

export default app;
