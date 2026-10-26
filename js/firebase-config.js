/**
 * ExpenseX - Official Firebase Configuration & Initialization
 * Project: expensex-a6d8a (739919926704)
 */

const firebaseConfig = {
  projectId: "expensex-a6d8a",
  appId: "1:739919926704:web:1fdae0d7a99b6bf7797275",
  storageBucket: "expensex-a6d8a.firebasestorage.app",
  apiKey: "AIzaSyBO7koo-Nw_PLReFa3O62H05KE0Alquz_g",
  authDomain: "expensex-a6d8a.firebaseapp.com",
  messagingSenderId: "739919926704",
  measurementId: "G-YKXJC7NFG5",
  projectNumber: "739919926704"
};

function initFirebase() {
  if (window.firebase && (!window.firebase.apps || window.firebase.apps.length === 0)) {
    try {
      firebase.initializeApp(firebaseConfig);
      console.log("✅ Firebase initialized successfully for expensex-a6d8a");
    } catch (e) {
      console.warn("Firebase initialization notice:", e);
    }
  }
}

// Auto-run if script loads after DOM
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initFirebase();
} else {
  document.addEventListener('DOMContentLoaded', initFirebase);
}
