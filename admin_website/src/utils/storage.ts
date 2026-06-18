/**
 * Safe localStorage wrapper for Next.js SSR compatibility
 * Prevents "localStorage is not defined" errors during server-side rendering
 */

const isClient = typeof window !== 'undefined';

export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (!isClient) return null;
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return null;
    }
  },

  setItem: (key: string, value: string): void => {
    if (!isClient) return;
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error(`Error writing localStorage key "${key}":`, error);
    }
  },

  removeItem: (key: string): void => {
    if (!isClient) return;
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  },

  clear: (): void => {
    if (!isClient) return;
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }
};

export const safeSessionStorage = {
  getItem: (key: string): string | null => {
    if (!isClient) return null;
    try {
      return sessionStorage.getItem(key);
    } catch (error) {
      console.error(`Error reading sessionStorage key "${key}":`, error);
      return null;
    }
  },

  setItem: (key: string, value: string): void => {
    if (!isClient) return;
    try {
      sessionStorage.setItem(key, value);
    } catch (error) {
      console.error(`Error writing sessionStorage key "${key}":`, error);
    }
  },

  removeItem: (key: string): void => {
    if (!isClient) return;
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing sessionStorage key "${key}":`, error);
    }
  },

  clear: (): void => {
    if (!isClient) return;
    try {
      sessionStorage.clear();
    } catch (error) {
      console.error('Error clearing sessionStorage:', error);
    }
  }
};

// Helper to check if code is running on client side
export const isClientSide = (): boolean => isClient;
