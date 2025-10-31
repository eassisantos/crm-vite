import { useEffect, useState } from 'react';

const inMemoryStore = new Map<string, unknown>();

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (inMemoryStore.has(key)) {
      return inMemoryStore.get(key) as T;
    }
    inMemoryStore.set(key, initialValue);
    return initialValue;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(key);
      } catch (error) {
        console.warn('Não foi possível limpar o dado sensível do localStorage.', error);
      }
    }

    if (inMemoryStore.has(key)) {
      setStoredValue(inMemoryStore.get(key) as T);
    } else {
      inMemoryStore.set(key, initialValue);
      setStoredValue(initialValue);
    }
  }, [key, initialValue]);

  const setValue = (value: T | ((val: T) => T)) => {
    setStoredValue((prev) => {
      const valueToStore = value instanceof Function ? value(prev) : value;
      inMemoryStore.set(key, valueToStore);
      return valueToStore;
    });
  };

  return [storedValue, setValue];
}
