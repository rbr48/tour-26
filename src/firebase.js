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
// Lets the photo fallback upload to Drive with the user's own token when the
// shared upload endpoint is unavailable.
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');

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
      const webClientId = '26498265392-seil3pfcqcj6ie5049askpblsnvuq7nn.apps.googleusercontent.com';
      let result;
      try {
        result = await FirebaseAuthentication.signInWithGoogle({
          skipNativeAuth: false,
          useCredentialManager: true,
          webClientId,
        });
      } catch (err1) {
        console.warn('Native Google Sign-In with CredentialManager failed, trying legacy GoogleSignInClient:', err1);
        try {
          result = await FirebaseAuthentication.signInWithGoogle({
            skipNativeAuth: false,
            useCredentialManager: false,
            webClientId,
          });
        } catch (err2) {
          console.warn('Native Google Sign-In without skipNativeAuth failed, trying with skipNativeAuth: true:', err2);
          result = await FirebaseAuthentication.signInWithGoogle({
            skipNativeAuth: true,
            useCredentialManager: false,
            webClientId,
          });
        }
      }

      const idToken = result.credential?.idToken || result.idToken;
      if (idToken) {
        const credential = GoogleAuthProvider.credential(idToken);
        const userCredential = await signInWithCredential(auth, credential);
        return userCredential.user;
      }
      if (result.user) {
        return result.user;
      }
      throw new Error('গুগল অ্যাকাউন্ট থেকে কোনো ক্রেডেনশিয়াল পাওয়া যায়নি');
    }

    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      setDriveAccessToken(credential.accessToken);
    }
    return result.user;
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
};

// Re-authorize or connect Google Drive explicitly.
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
