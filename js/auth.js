/**
 * ExpenseX - Authentication Service
 * Manages Firebase Auth & Local Session Synchronization
 */

const Auth = {
  async init() {
    await window.ExpenseXConfig.initFirebase();

    if (window.firebase && window.firebase.auth && window.ExpenseXConfig.isFirebaseInitialized()) {
      firebase.auth().onAuthStateChanged((user) => {
        if (user) {
          localStorage.setItem('expensex_user_uid', user.uid);
          localStorage.setItem('expensex_user_email', user.email);
          if (user.displayName) {
            localStorage.setItem('expensex_user_name', user.displayName);
          }
        }
      });
    }
  },

  getCurrentUser() {
    const uid = localStorage.getItem('expensex_user_uid');
    const email = localStorage.getItem('expensex_user_email');
    const name = localStorage.getItem('expensex_user_name') || (email ? email.split('@')[0] : 'User');

    if (!uid && !email) {
      return null;
    }

    return {
      uid: uid || 'local_' + (email ? email.replace(/[^a-zA-Z0-9]/g, '_') : 'guest'),
      email: email || 'user@expensex.app',
      displayName: name
    };
  },

  async login(email, password) {
    const fb = await window.ExpenseXConfig.initFirebase();

    if (fb.auth && !fb.isOffline) {
      try {
        const userCredential = await fb.auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        const name = user.displayName || email.split('@')[0];
        
        localStorage.setItem('expensex_user_uid', user.uid);
        localStorage.setItem('expensex_user_email', user.email);
        localStorage.setItem('expensex_user_name', name);
        
        return { success: true, user };
      } catch (error) {
        console.error("Firebase Login Error:", error);
        return { success: false, error: this.formatAuthError(error.code) };
      }
    } else {
      // Local fallback mode: check against registered accounts in localStorage
      const accounts = JSON.parse(localStorage.getItem('expensex_registered_users') || '{}');
      const userKey = email.toLowerCase().trim();

      if (accounts[userKey] && accounts[userKey].password !== password) {
        return { success: false, error: "Incorrect password. Please try again." };
      }

      const name = accounts[userKey] ? accounts[userKey].fullName : email.split('@')[0];
      const uid = 'local_' + userKey.replace(/[^a-zA-Z0-9]/g, '_');

      localStorage.setItem('expensex_user_uid', uid);
      localStorage.setItem('expensex_user_email', email);
      localStorage.setItem('expensex_user_name', name);

      return { success: true, user: { uid, email, displayName: name } };
    }
  },

  async register(fullName, email, password, securityQuestion, securityAnswer) {
    const fb = await window.ExpenseXConfig.initFirebase();

    if (fb.auth && !fb.isOffline) {
      try {
        const userCredential = await fb.auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Update displayName
        await user.updateProfile({ displayName: fullName });

        // Save profile in Firestore
        if (fb.db) {
          await fb.db.collection('users').doc(user.uid).set({
            fullName,
            email,
            securityQuestion: securityQuestion || '',
            securityAnswer: securityAnswer || '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        }

        localStorage.setItem('expensex_user_uid', user.uid);
        localStorage.setItem('expensex_user_email', user.email);
        localStorage.setItem('expensex_user_name', fullName);

        return { success: true, user };
      } catch (error) {
        console.error("Firebase Registration Error:", error);
        return { success: false, error: this.formatAuthError(error.code) };
      }
    } else {
      // Save locally
      const accounts = JSON.parse(localStorage.getItem('expensex_registered_users') || '{}');
      const userKey = email.toLowerCase().trim();

      accounts[userKey] = {
        fullName,
        email,
        password,
        securityQuestion,
        securityAnswer,
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('expensex_registered_users', JSON.stringify(accounts));

      const uid = 'local_' + userKey.replace(/[^a-zA-Z0-9]/g, '_');
      localStorage.setItem('expensex_user_uid', uid);
      localStorage.setItem('expensex_user_email', email);
      localStorage.setItem('expensex_user_name', fullName);

      return { success: true, user: { uid, email, displayName: fullName } };
    }
  },

  async logout() {
    try {
      if (window.firebase && window.firebase.auth && window.ExpenseXConfig.isFirebaseInitialized()) {
        await firebase.auth().signOut();
      }
    } catch (e) {
      console.warn("Firebase signout error:", e);
    }
    localStorage.removeItem('expensex_user_uid');
    localStorage.removeItem('expensex_user_email');
    localStorage.removeItem('expensex_user_name');
    window.location.href = 'index.html';
  },

  requireAuth() {
    const user = this.getCurrentUser();
    if (!user) {
      window.location.href = 'index.html';
    }
    return user;
  },

  redirectIfAuthenticated() {
    const user = this.getCurrentUser();
    if (user) {
      window.location.href = 'dashboard.html';
    }
  },

  formatAuthError(code) {
    switch (code) {
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Invalid email or password.';
      case 'auth/email-already-in-use':
        return 'An account already exists with this email address.';
      case 'auth/weak-password':
        return 'Password must be at least 6 characters.';
      case 'auth/network-request-failed':
        return 'Network connection error. Please check your internet.';
      default:
        return 'Authentication failed. Please try again.';
    }
  },

  showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
};

window.ExpenseXAuth = Auth;
