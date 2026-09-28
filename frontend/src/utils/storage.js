// ============================================================
// LOCAL STORAGE UTILITIES
// ============================================================
import { STORAGE_KEYS } from '../data/constants.js';

export function getItem(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('LocalStorage getItem error:', e);
    return null;
  }
}

export function setItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error('LocalStorage setItem error:', e);
    return false;
  }
}

export function removeItem(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    console.error('LocalStorage removeItem error:', e);
    return false;
  }
}

// --- Generic helpers for entity collections ---
export function getCollection(key) {
  return getItem(key) || [];
}

export function saveCollection(key, data) {
  return setItem(key, data);
}

// --- Check if system is initialized ---
export function isInitialized() {
  return getItem(STORAGE_KEYS.INITIALIZED) === true;
}

export function setInitialized() {
  setItem(STORAGE_KEYS.INITIALIZED, true);
}

// --- Clear all app data ---
export function clearAllData() {
  Object.values(STORAGE_KEYS).forEach(key => removeItem(key));
}
