/**
 * IndexedDB Persistence Layer for FITTRACK
 * Stores all user data locally on device.
 */

import { DEFAULT_WORKOUT_PLAN } from '../data/workoutPlans.js';
import { validateBackupPayload } from '../utils/validation.js';

const DB_NAME = 'fittrack_db';
const DB_VERSION = 1;
const LS_PREFIX = 'fittrack_ls_';

export const STORES = [
  'profile',
  'workouts',
  'weights',
  'foods',
  'mealPlans',
  'water',
  'workoutPlans',
];

let dbPromise = null;
let useLocalStorageFallback = false;
const memoryFallback = new Map();

function lsReadStore(storeName) {
  try {
    const raw = window.localStorage.getItem(LS_PREFIX + storeName);
    if (raw) return JSON.parse(raw);
  } catch (_) {
    // ignore
  }
  return memoryFallback.get(storeName) || [];
}

function lsWriteStore(storeName, items) {
  memoryFallback.set(storeName, items);
  try {
    window.localStorage.setItem(LS_PREFIX + storeName, JSON.stringify(items));
  } catch (_) {
    // ignore quota/private-mode errors
  }
}

export function openDB() {
  if (useLocalStorageFallback) return Promise.resolve(null);
  if (dbPromise) return dbPromise;

  if (typeof indexedDB === 'undefined') {
    useLocalStorageFallback = true;
    return Promise.resolve(null);
  }

  dbPromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains('profile')) {
          db.createObjectStore('profile', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('workouts')) {
          const s = db.createObjectStore('workouts', { keyPath: 'id' });
          s.createIndex('date', 'date', { unique: false });
        }
        if (!db.objectStoreNames.contains('weights')) {
          const s = db.createObjectStore('weights', { keyPath: 'id' });
          s.createIndex('date', 'date', { unique: false });
        }
        if (!db.objectStoreNames.contains('foods')) {
          const s = db.createObjectStore('foods', { keyPath: 'id' });
          s.createIndex('date', 'date', { unique: false });
        }
        if (!db.objectStoreNames.contains('mealPlans')) {
          const s = db.createObjectStore('mealPlans', { keyPath: 'id' });
          s.createIndex('day', 'day', { unique: false });
        }
        if (!db.objectStoreNames.contains('water')) {
          const s = db.createObjectStore('water', { keyPath: 'id' });
          s.createIndex('date', 'date', { unique: false });
        }
        if (!db.objectStoreNames.contains('workoutPlans')) {
          db.createObjectStore('workoutPlans', { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        useLocalStorageFallback = true;
        resolve(null);
      };
    } catch (_) {
      useLocalStorageFallback = true;
      resolve(null);
    }
  });

  return dbPromise;
}

export async function getAll(storeName) {
  const db = await openDB();
  if (!db) return lsReadStore(storeName);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function getById(storeName, id) {
  const db = await openDB();
  if (!db) return lsReadStore(storeName).find((item) => item.id === id) || null;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function putItem(storeName, item) {
  const db = await openDB();
  if (!db) {
    const items = lsReadStore(storeName);
    const idx = items.findIndex((x) => x.id === item.id);
    if (idx >= 0) items[idx] = item;
    else items.push(item);
    lsWriteStore(storeName, items);
    return item;
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(item);
    tx.oncomplete = () => resolve(item);
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteItem(storeName, id) {
  const db = await openDB();
  if (!db) {
    lsWriteStore(storeName, lsReadStore(storeName).filter((x) => x.id !== id));
    return;
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearStore(storeName) {
  const db = await openDB();
  if (!db) {
    lsWriteStore(storeName, []);
    return;
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function ensureDefaults() {
  const profile = await getById('profile', 'user');
  if (!profile) {
    await putItem('profile', {
      id: 'user',
      name: '',
      age: '',
      heightCm: '',
      currentWeightKg: '',
      targetWeightKg: '',
      gender: '',
      activityLevel: 'light',
      experience: 'beginner',
      goal: 'fat_loss',
      location: 'home',
      preferredUnit: 'kg',
      dailyCalorieTarget: 2000,
      dailyWaterGoalMl: 2500,
      updatedAt: Date.now(),
    });
  }

  const plans = await getAll('workoutPlans');
  if (plans.length === 0) {
    await putItem('workoutPlans', DEFAULT_WORKOUT_PLAN);
  }
}

export async function exportAllData() {
  const stores = {};
  for (const name of STORES) {
    stores[name] = await getAll(name);
  }
  return {
    app: 'FITTRACK',
    version: 1,
    exportedAt: new Date().toISOString(),
    stores,
  };
}

export async function importAllData(payload) {
  const check = validateBackupPayload(payload);
  if (!check.valid) {
    throw new Error(check.error);
  }

  const db = await openDB();
  if (!db) {
    for (const name of STORES) {
      lsWriteStore(name, payload.stores[name]);
    }
    return;
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES, 'readwrite');
    for (const name of STORES) {
      const store = tx.objectStore(name);
      store.clear();
      for (const item of payload.stores[name]) {
        store.put(item);
      }
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Failed to import backup'));
  });
}

export async function clearAllUserData() {
  for (const name of STORES) {
    await clearStore(name);
  }
  await ensureDefaults();
}
