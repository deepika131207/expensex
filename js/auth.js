/**
 * ExpenseX - Authentication & Web Usage Tracking Service
 * Manages Firebase Auth, Session Synchronization, and records all
 * user login and web application usage events directly into Cloud Firestore.
 */

const Auth = {
  async init() {
    await window.ExpenseXConfig.initFirebase();

    if (window.firebase && window.firebase.auth && window.ExpenseXConfig.isFirebaseInitialized()) {
      firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
          localStorage.setItem('expensex_user_uid', user.uid);
          localStorage.setItem('expensex_user_email', user.email);
          if (user.displayName) {
            localStorage.setItem('expensex_user_name', user.displayName);
          }
          // Record online presence & heartbeat
          await this.recordPresence(user.uid, true);
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

  /**
   * Records user login and session data into Cloud Firestore:
   * 1. users/{uid} (user account document)
   * 2. user_profiles/{uid} (global directory for easy console inspection)
   * 3. users/{uid}/login_history (detailed session history)
   * 4. user_logins (global real-time login audit stream)
   */
  async recordLoginEventInFirestore(user, actionType = 'LOGIN') {
    if (!window.firebase || !window.firebase.firestore || !window.ExpenseXConfig.isFirebaseInitialized()) {
      // Local fallback logging
      const localLogs = JSON.parse(localStorage.getItem('expensex_login_logs') || '[]');
      localLogs.unshift({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0],
        action: actionType,
        device: navigator.userAgent,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('expensex_login_logs', JSON.stringify(localLogs.slice(0, 50)));
      return;
    }

    try {
      const db = firebase.firestore();
      const serverTimestamp = firebase.firestore.FieldValue.serverTimestamp();
      const displayName = user.displayName || user.email.split('@')[0];

      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: displayName,
        lastLoginAt: serverTimestamp,
        lastSeenAt: serverTimestamp,
        isOnline: true,
        loginCount: firebase.firestore.FieldValue.increment(1),
        device: navigator.userAgent,
        platform: navigator.platform || 'web'
      };

      // 1. Update user master doc
      await db.collection('users').doc(user.uid).set(userData, { merge: true });

      // 2. Update global user_profiles directory
      await db.collection('user_profiles').doc(user.uid).set(userData, { merge: true });

      // 3. Add to user-specific login history subcollection
      await db.collection('users').doc(user.uid).collection('login_history').add({
        action: actionType,
        timestamp: serverTimestamp,
        device: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        url: window.location.href
      });

      // 4. Add to global audit stream of all logins
      await db.collection('user_logins').add({
        uid: user.uid,
        email: user.email,
        displayName: displayName,
        action: actionType,
        timestamp: serverTimestamp,
        userAgent: navigator.userAgent
      });

      console.log(`✅ Recorded ${actionType} event for ${user.email} in Firestore`);
    } catch (e) {
      console.warn("Could not record login event to Firestore:", e);
    }
  },

  /**
   * Records web application usage actions into Cloud Firestore:
   * (e.g. Budget updates, Expense entries, Tab switches, Page views)
   */
  async recordWebUsage(action, details = {}) {
    const user = this.getCurrentUser();
    if (!user) return;

    if (!window.firebase || !window.firebase.firestore || !window.ExpenseXConfig.isFirebaseInitialized()) {
      const localUsage = JSON.parse(localStorage.getItem('expensex_web_usage') || '[]');
      localUsage.unshift({
        uid: user.uid,
        email: user.email,
        action,
        details,
        path: window.location.pathname,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('expensex_web_usage', JSON.stringify(localUsage.slice(0, 100)));
      return;
    }

    try {
      const db = firebase.firestore();
      const serverTimestamp = firebase.firestore.FieldValue.serverTimestamp();

      const usageRecord = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        action: action,
        details: details,
        path: window.location.pathname,
        timestamp: serverTimestamp,
        userAgent: navigator.userAgent
      };

      // 1. User subcollection: users/{uid}/usage_logs
      await db.collection('users').doc(user.uid).collection('usage_logs').add(usageRecord);

      // 2. Global web usage stream: web_usage_events
      await db.collection('web_usage_events').add(usageRecord);

      // 3. Bump total actions on user document
      await db.collection('users').doc(user.uid).set({
        lastSeenAt: serverTimestamp,
        totalWebActions: firebase.firestore.FieldValue.increment(1)
      }, { merge: true });

      console.log(`⚡ Logged web usage [${action}] to Firestore`);
    } catch (err) {
      console.warn("Could not log web usage to Firestore:", err);
    }
  },

  async recordPresence(uid, isOnline) {
    if (!window.firebase || !window.firebase.firestore || !window.ExpenseXConfig.isFirebaseInitialized()) return;
    try {
      const db = firebase.firestore();
      await db.collection('users').doc(uid).set({
        isOnline: isOnline,
        lastSeenAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (e) {
      // Ignore background presence errors
    }
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

        // Record login in Firestore database
        await this.recordLoginEventInFirestore(user, 'LOGIN');
        await this.recordWebUsage('USER_LOGIN', { method: 'password' });

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

      await this.recordLoginEventInFirestore({ uid, email, displayName: name }, 'LOCAL_LOGIN');
      await this.recordWebUsage('USER_LOGIN', { method: 'local_fallback' });

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

        // Save detailed profile in Firestore
        if (fb.db) {
          const profileData = {
            uid: user.uid,
            fullName,
            email,
            securityQuestion: securityQuestion || '',
            securityAnswer: securityAnswer || '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
            isOnline: true,
            loginCount: 1,
            role: 'user'
          };

          await fb.db.collection('users').doc(user.uid).set(profileData, { merge: true });
          await fb.db.collection('user_profiles').doc(user.uid).set(profileData, { merge: true });
        }

        localStorage.setItem('expensex_user_uid', user.uid);
        localStorage.setItem('expensex_user_email', user.email);
        localStorage.setItem('expensex_user_name', fullName);

        // Record register event in Firestore database
        await this.recordLoginEventInFirestore({ uid: user.uid, email, displayName: fullName }, 'REGISTER');
        await this.recordWebUsage('USER_REGISTERED', { email, fullName });

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

      await this.recordLoginEventInFirestore({ uid, email, displayName: fullName }, 'LOCAL_REGISTER');
      await this.recordWebUsage('USER_REGISTERED', { email, fullName });

      return { success: true, user: { uid, email, displayName: fullName } };
    }
  },

  async logout() {
    const user = this.getCurrentUser();
    if (user) {
      await this.recordWebUsage('USER_LOGOUT');
      await this.recordPresence(user.uid, false);
    }

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
