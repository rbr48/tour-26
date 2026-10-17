import { initializeApp } from 'firebase/app';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
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
// Lets the photo fallback upload to Drive with the user's own token when the
// shared upload endpoint is unavailable.
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');

export const isMobileBrowser = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

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

export const checkRedirectResult = async () => {
  if (Capacitor.isNativePlatform()) return null;
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setDriveAccessToken(credential.accessToken);
      }
      return result.user;
    }
    return null;
  } catch (error) {
    console.error('Redirect Sign-In Result Error:', error);
    throw error;
  }
};

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

    // On mobile web browsers (Chrome/Safari), popups open in separate tabs without
    // opener context, causing hangs on __/auth/handler. signInWithRedirect performs a clean full-page flow.
    if (isMobileBrowser()) {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }

    // Desktop browsers support standard popups
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setDriveAccessToken(credential.accessToken);
      }
      return result.user;
    } catch (popupErr) {
      if (popupErr.code === 'auth/popup-blocked' || popupErr.code === 'auth/cancelled-popup-request') {
        console.warn('Popup blocked, falling back to signInWithRedirect:', popupErr);
        await signInWithRedirect(auth, googleProvider);
        return null;
      }
      throw popupErr;
    }
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
};

// Re-authorize or connect Google Drive explicitly.
export const connectGoogleDrive = async () => {
  try {
    if (isMobileBrowser() && !Capacitor.isNativePlatform()) {
      await signInWithRedirect(auth, googleProvider);
      return { success: true, redirecting: true };
    }
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
