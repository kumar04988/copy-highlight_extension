// Suggestion texts that an earlier version added automatically on install.
// Removed once so the user starts with an empty list and adds their own.
const OLD_DEFAULT_SUGGESTIONS = ['telugu review', 'review', 'imdb rating', 'ott release date', 'meaning', 'wikipedia']

chrome.runtime.onInstalled.addListener(async () => {
  // Run only once, so texts the user adds later (even "review") are never removed
  const { suggestions = [], oldDefaultsRemoved } = await chrome.storage.local.get(['suggestions', 'oldDefaultsRemoved'])
  if (oldDefaultsRemoved) return
  await chrome.storage.local.set({
    suggestions: suggestions.filter((s) => !OLD_DEFAULT_SUGGESTIONS.includes(s.text)),
    oldDefaultsRemoved: true,
  })
})

// Opens a suggestion URL in a new tab, right next to the current tab.
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type === 'OPEN_URL' && msg.url) {
    chrome.tabs.create({
      url: msg.url,
      index: sender.tab ? sender.tab.index + 1 : undefined,
    })
  }
})
