// ─── Firebase JS SDK v10 initialisation ──────────────────────────────────────
// Credentials are loaded from environment variables via app.config.js.
// Set them in your .env file — see .env.example for reference.

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

const firebaseConfig = {
    apiKey: extra.firebaseApiKey || 'YOUR_API_KEY',
    authDomain: extra.firebaseAuthDomain || 'YOUR_PROJECT_ID.firebaseapp.com',
    projectId: extra.firebaseProjectId || 'YOUR_PROJECT_ID',
    storageBucket: extra.firebaseStorageBucket || 'YOUR_PROJECT_ID.appspot.com',
    messagingSenderId: extra.firebaseMessagingSenderId || 'YOUR_SENDER_ID',
    appId: extra.firebaseAppId || 'YOUR_APP_ID',
};

// Prevent re-initialisation during Expo Fast Refresh
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
export const auth = getApps().length === 1
  ? initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    })
  : getAuth(app);
export default app;
