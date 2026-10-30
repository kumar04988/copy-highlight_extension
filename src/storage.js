// Saves data in chrome.storage.local inside the extension.
// Falls back to localStorage when running with `npm run dev` in a normal tab.
const hasChromeStorage = typeof chrome !== 'undefined' && chrome.storage?.local

async function load(storageKey, fallback = []) {
  if (hasChromeStorage) {
    const result = await chrome.storage.local.get(storageKey)
    return result[storageKey] ?? fallback
  }
  const saved = localStorage.getItem(storageKey)
  return saved === null ? fallback : JSON.parse(saved)
}

async function save(storageKey, data) {
  if (hasChromeStorage) {
    await chrome.storage.local.set({ [storageKey]: data })
    return
  }
  localStorage.setItem(storageKey, JSON.stringify(data))
}

// Key/value clipboard items: [{ id, key, value }]
export const loadItems = () => load('kvItems')
export const saveItems = (items) => save('kvItems', items)

// Suggestion suffixes shown on highlighted text: [{ id, text }]
// Same storage key is read by public/content.js
export const loadSuggestions = () => load('suggestions')
export const saveSuggestions = (suggestions) => save('suggestions', suggestions)

// Width share of the key column (0.15 – 0.85). The value column gets the rest.
export const DEFAULT_KEY_RATIO = 1 / 3
export const loadKeyRatio = () => load('keyRatio', DEFAULT_KEY_RATIO)
export const saveKeyRatio = (ratio) => save('keyRatio', ratio)
