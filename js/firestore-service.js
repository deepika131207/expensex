/**
 * ExpenseX - Firestore Database Service
 * Provides real-time synchronization of budgets, expenses, and categories,
 * as well as granular subcollections for expenses and web application usage tracking.
 */

const DEFAULT_CATEGORIES = [
  'Food',
  'Travel',
  'Entertainment',
  'Groceries',
  'Medical',
  'Bills',
  'Shopping',
  'Education',
  'Housing',
  'Other'
];

const DEFAULT_BUDGETS = {
  overall: 40000,
  food: 10000,
  travel: 8000,
  entertainment: 5000,
  groceries: 7000,
  medical: 3000,
  bills: 5000
};

const CATEGORY_ICONS = {
  'food': '🍔',
  'travel': '✈️',
  'entertainment': '🎬',
  'groceries': '🛒',
  'medical': '💊',
  'bills': '⚡',
  'shopping': '🛍️',
  'education': '🎓',
  'housing': '🏠',
  'other': '📦'
};

const FirestoreService = {
  getCategoryIcon(catName) {
    if (!catName) return '🏷️';
    const clean = catName.trim().toLowerCase();
    return CATEGORY_ICONS[clean] || '🏷️';
  },

  getLocalData(uid) {
    const key = `expensex_db_${uid}`;
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Could not read local data:", e);
    }

    // Default starter dataset
    const starter = {
      overallBudget: DEFAULT_BUDGETS.overall,
      budgets: { ...DEFAULT_BUDGETS },
      categories: [...DEFAULT_CATEGORIES],
      expenses: [
        {
          id: 'exp_' + (Date.now() - 86400000 * 2),
          title: 'Weekly Supermarket Grocery',
          category: 'Groceries',
          amount: 3200,
          date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0]
        },
        {
          id: 'exp_' + (Date.now() - 86400000),
          title: 'Weekend Dinner & Bistro',
          category: 'Food',
          amount: 1850,
          date: new Date(Date.now() - 86400000).toISOString().split('T')[0]
        },
        {
          id: 'exp_' + Date.now(),
          title: 'Metro Pass & Fuel',
          category: 'Travel',
          amount: 2400,
          date: new Date().toISOString().split('T')[0]
        }
      ]
    };
    this.saveLocalData(uid, starter);
    return starter;
  },

  saveLocalData(uid, data) {
    const key = `expensex_db_${uid}`;
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error("Failed to save local data:", e);
    }
  },

  async syncToFirestore(uid, data) {
    const isReady = window.firebase && window.firebase.firestore && window.firebase.apps && window.firebase.apps.length > 0;
    if (isReady) {
      try {
        const db = firebase.firestore();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 2000));
        
        // Master budget document
        const writePromise = db.collection('users').doc(uid).collection('budget_data').doc('main').set({
          ...data,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        await Promise.race([writePromise, timeoutPromise]);

        // Update overall stats on user document (Non-blocking)
        db.collection('users').doc(uid).set({
          overallBudget: data.overallBudget || 0,
          totalExpensesCount: (data.expenses || []).length,
          lastDataSyncAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).catch(() => {});

        console.log("☁️ Synced to Firestore successfully");
        return true;
      } catch (e) {
        console.warn("Firestore sync notice (data safely cached locally):", e);
      }
    }
    return false;
  },

  subscribe(uid, onDataUpdate) {
    // 1. Immediately return local data
    const localData = this.getLocalData(uid);
    onDataUpdate(localData);

    // 2. If Firestore is active, listen for real-time changes
    const isReady = window.firebase && window.firebase.firestore && window.firebase.apps && window.firebase.apps.length > 0;
    if (isReady) {
      try {
        const db = firebase.firestore();
        const docRef = db.collection('users').doc(uid).collection('budget_data').doc('main');

        const unsubscribe = docRef.onSnapshot((doc) => {
          if (doc.exists) {
            const remoteData = doc.data();
            const merged = {
              overallBudget: remoteData.overallBudget ?? localData.overallBudget,
              budgets: remoteData.budgets || localData.budgets,
              categories: remoteData.categories || localData.categories,
              expenses: remoteData.expenses || localData.expenses
            };
            this.saveLocalData(uid, merged);
            onDataUpdate(merged);
          } else {
            // First time: upload local starter data to Firestore
            this.syncToFirestore(uid, localData);
          }
        }, (error) => {
          console.warn("Firestore onSnapshot error:", error);
        });

        return unsubscribe;
      } catch (err) {
        console.warn("Failed to attach Firestore snapshot listener:", err);
      }
    }

    return () => {};
  },

  async setBudget(uid, categoryKey, amount) {
    const data = this.getLocalData(uid);
    const num = parseFloat(amount) || 0;

    if (!data.budgets) data.budgets = {};

    if (categoryKey === 'overall') {
      data.overallBudget = num;
      data.budgets.overall = num;
    } else {
      const cleanKey = categoryKey.trim().toLowerCase();
      data.budgets[cleanKey] = num;

      // Save to individual budget subcollection for granular Firestore queries
      if (window.firebase && window.firebase.firestore && window.ExpenseXConfig.isFirebaseInitialized()) {
        try {
          const db = firebase.firestore();
          await db.collection('users').doc(uid).collection('budgets').doc(cleanKey).set({
            category: cleanKey,
            budgetLimit: num,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        } catch (e) {
          console.warn("Could not save subcollection budget:", e);
        }
      }
    }

    this.saveLocalData(uid, data);
    await this.syncToFirestore(uid, data);

    // Record web usage in Firestore
    if (window.ExpenseXAuth && window.ExpenseXAuth.recordWebUsage) {
      await window.ExpenseXAuth.recordWebUsage('SET_BUDGET', {
        category: categoryKey,
        amount: num
      });
    }

    return data;
  },

  async addExpense(uid, expense) {
    const data = this.getLocalData(uid);
    if (!data.expenses) data.expenses = [];

    const newExpense = {
      id: 'exp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: expense.title || 'Expense',
      amount: parseFloat(expense.amount) || 0,
      category: expense.category || 'Other',
      date: expense.date || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };

    // Ensure category exists
    if (!data.categories.some(c => c.toLowerCase() === newExpense.category.toLowerCase())) {
      data.categories.push(newExpense.category);
    }

    data.expenses.unshift(newExpense);
    this.saveLocalData(uid, data);
    await this.syncToFirestore(uid, data);

    // Save individual expense document in Firestore subcollection: users/{uid}/expenses/{id}
    if (window.firebase && window.firebase.firestore && window.ExpenseXConfig.isFirebaseInitialized()) {
      try {
        const db = firebase.firestore();
        await db.collection('users').doc(uid).collection('expenses').doc(newExpense.id).set({
          ...newExpense,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
      } catch (e) {
        console.warn("Could not save subcollection expense:", e);
      }
    }

    // Record web usage in Firestore
    if (window.ExpenseXAuth && window.ExpenseXAuth.recordWebUsage) {
      await window.ExpenseXAuth.recordWebUsage('ADD_EXPENSE', {
        id: newExpense.id,
        title: newExpense.title,
        amount: newExpense.amount,
        category: newExpense.category,
        date: newExpense.date
      });
    }

    return { data, newExpense };
  },

  async deleteExpense(uid, expenseId) {
    const data = this.getLocalData(uid);
    if (!data.expenses) return data;

    const removed = data.expenses.find(e => e.id === expenseId);
    data.expenses = data.expenses.filter(e => e.id !== expenseId);
    this.saveLocalData(uid, data);
    await this.syncToFirestore(uid, data);

    // Delete from Firestore subcollection: users/{uid}/expenses/{id}
    if (window.firebase && window.firebase.firestore && window.ExpenseXConfig.isFirebaseInitialized()) {
      try {
        const db = firebase.firestore();
        await db.collection('users').doc(uid).collection('expenses').doc(expenseId).delete();
      } catch (e) {
        console.warn("Could not delete subcollection expense:", e);
      }
    }

    // Record web usage in Firestore
    if (window.ExpenseXAuth && window.ExpenseXAuth.recordWebUsage) {
      await window.ExpenseXAuth.recordWebUsage('DELETE_EXPENSE', {
        expenseId,
        details: removed || {}
      });
    }

    return data;
  },

  async addCategory(uid, categoryName) {
    const data = this.getLocalData(uid);
    const clean = categoryName.trim();
    if (!clean) return data;

    if (!data.categories.some(c => c.toLowerCase() === clean.toLowerCase())) {
      data.categories.push(clean);
      this.saveLocalData(uid, data);
      await this.syncToFirestore(uid, data);

      if (window.ExpenseXAuth && window.ExpenseXAuth.recordWebUsage) {
        await window.ExpenseXAuth.recordWebUsage('ADD_CATEGORY', { category: clean });
      }
    }
    return data;
  }
};

window.ExpenseXDB = FirestoreService;
