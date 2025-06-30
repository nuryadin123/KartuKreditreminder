// A custom hook for persisting state to local storage.
"use client";

import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      try {
        const item = window.localStorage.getItem(key);
        // Set state from local storage if it exists, otherwise use initialValue.
        // This is only done once when the component mounts on the client.
        setStoredValue(item ? JSON.parse(item) : initialValue);
      } catch (error) {
        console.log(error);
        setStoredValue(initialValue);
      }
    }
    // We intentionally omit `initialValue` from the dependency array.
    // It's only meant to be used on the first client-side check, and including it
    // can cause an infinite loop if a new array/object reference is passed on each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient, key]);

  const setValue = (value: T | ((val: T) => T)) => {
    if (!isClient) {
      return;
    }
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.log(error);
    }
  };

  return [storedValue, setValue];
}
