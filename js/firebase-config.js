/**
 * ExpenseX - Firebase Configuration & Initialization Service
 * Supports:
 * 1. Automatic Firebase Hosting detection via /__/firebase/init.js
 * 2. Custom API Key entry via LocalStorage for GitHub Pages / local testing
 * 3. Graceful fallback mode if API key is not yet set
 */

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "", // Can be supplied via Settings Modal or LocalStorage
  authDomain: "expensex-a6d8a.firebaseapp.com",
  projectId: "expensex-a6d8a",
  storageBucket: "expensex-a6d8a.firebasestorage.app",
  messagingSenderId: "739919926704",
  appId: "1:739919926704:web:expensex"
};

let firebaseInitialized = false;
let isOfflineMode = false;

function getStoredFirebaseConfig() {
  try {
    const stored = localStorage.getItem('expensex_firebase_config');
    if (stored) {
      return { ...DEFAULT_FIREBASE_CONFIG, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.warn("Could not read stored Firebase config", e);
  }
  return { ...DEFAULT_FIREBASE_CONFIG };
}

function saveFirebaseConfig(config) {
  try {
    localStorage.setItem('expensex_firebase_config', JSON.stringify(config));
    return true;
  } catch (e) {
    console.error("Could not save Firebase config", e);
    return false;
  }
}

async function initFirebase() {
  // If already initialized, return existing instances
  if (firebaseInitialized && window.firebase && window.firebase.apps && window.firebase.apps.length > 0) {
    return {
      auth: firebase.auth(),
      db: firebase.firestore(),
      isOffline: false
    };
  }

  // Check if Firebase Hosting auto-initialized via /__/firebase/init.js
  if (window.firebase && window.firebase.apps && window.firebase.apps.length > 0) {
    console.log("⚡ Firebase initialized automatically via Firebase Hosting init script");
    firebaseInitialized = true;
    return {
      auth: firebase.auth(),
      db: firebase.firestore(),
      isOffline: false
    };
  }

  const activeConfig = getStoredFirebaseConfig();

  // If apiKey is present and firebase is loaded via CDN
  if (window.firebase && activeConfig.apiKey && activeConfig.apiKey.trim() !== "") {
    try {
      firebase.initializeApp(activeConfig);
      console.log("✅ Firebase initialized successfully with active configuration");
      firebaseInitialized = true;
      return {
        auth: firebase.auth(),
        db: firebase.firestore(),
        isOffline: false
      };
    } catch (err) {
      console.error("Failed to initialize Firebase:", err);
    }
  }

  // Graceful fallback mode
  console.info("ℹ️ Running in Local Storage cache mode (Firebase API key can be set in Settings)");
  isOfflineMode = true;
  return {
    auth: null,
    db: null,
    isOffline: true
  };
}

// Expose globally for browser scripts
window.ExpenseXConfig = {
  defaultConfig: DEFAULT_FIREBASE_CONFIG,
  getStoredFirebaseConfig,
  saveFirebaseConfig,
  initFirebase,
  isFirebaseInitialized: () => firebaseInitialized,
  isOffline: () => isOfflineMode
};
