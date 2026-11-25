/**
 * IndexedDB Persistence Layer for FITTRACK
 * Stores all user data locally on device.
 */

import { DEFAULT_WORKOUT_PLAN } from '../data/workoutPlans.js';
import { validateBackupPayload } from '../utils/validation.js';

const DB_NAME = 'fittrack_db';
const DB_VERSION = 1;

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

export function openDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
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
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });

  return dbPromise;
}

export async function getAll(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function getById(storeName, id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function putItem(storeName, item) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(item);
    tx.oncomplete = () => resolve(item);
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteItem(storeName, id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearStore(storeName) {
  const db = await openDB();
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
