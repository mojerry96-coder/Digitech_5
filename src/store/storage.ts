import type { StateStorage } from 'zustand/middleware'

/**
 * localStorage when it is usable; an in-memory map when it is blocked
 * (private windows, previews), so the app still runs without persistence.
 */
export function safeStorage(): StateStorage {
  try {
    const k = '__qcs_probe__'
    localStorage.setItem(k, '1')
    localStorage.removeItem(k)
    return localStorage
  } catch {
    const mem = new Map<string, string>()
    return {
      getItem: (k) => mem.get(k) ?? null,
      setItem: (k, v) => void mem.set(k, v),
      removeItem: (k) => void mem.delete(k),
    }
  }
}
