import type { ICache } from '@auth0/auth0-react'

// Auth0 tokens survive a reload in this tab and are cleared when its session storage ends.
const prefix = 'ap-practice:auth0:'
const memory = new Map<string, unknown>()

export const authCache: ICache = {
  get<T>(key: string): T | undefined {
    if (memory.has(key)) return memory.get(key) as T
    try {
      const entry = window.sessionStorage.getItem(prefix + key)
      return entry === null ? undefined : JSON.parse(entry)
    } catch {
      return undefined
    }
  },

  set<T>(key: string, entry: T) {
    try {
      window.sessionStorage.setItem(prefix + key, JSON.stringify(entry))
      memory.delete(key)
    } catch {
      memory.set(key, entry)
    }
  },

  remove(key) {
    memory.delete(key)
    try {
      window.sessionStorage.removeItem(prefix + key)
    } catch {
      // The browser may block session storage.
    }
  },

  allKeys() {
    const keys = new Set(memory.keys())
    try {
      for (const key of Object.keys(window.sessionStorage)) {
        if (key.startsWith(prefix)) keys.add(key.slice(prefix.length))
      }
    } catch {
      // The browser may block session storage.
    }
    return [...keys]
  },
}
