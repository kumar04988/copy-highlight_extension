// Runs inside every web page.
// When the user highlights text, show a small button. Clicking it shows
// "highlighted text + suggestion text" options; clicking one opens a Google search in a new tab.
// The suggestion texts are managed in the popup's "Suggestions" tab (saved in chrome.storage).
(() => {
  const MAX_TEXT_LENGTH = 150

  let host = null
  let root = null
  let selectedText = ''

  function createUI() {
    host = document.createElement('div')
    // Shadow DOM keeps our styles separate from the page's styles
    root = host.attachShadow({ mode: 'open' })
    root.innerHTML = `
      <style>
        :host { all: initial; }
        .wrap {
          position: absolute; z-index: 2147483647;
          font-family: Inter, system-ui, -apple-system, sans-serif; font-size: 13px;
          -webkit-font-smoothing: antialiased;
        }
        .btn {
          width: 30px; height: 30px; border-radius: 9px; border: none; cursor: pointer;
          display: grid; place-items: center; color: #fff;
          background: linear-gradient(135deg, #8b5cf6, #6366f1);
          box-shadow: 0 4px 14px rgba(99, 102, 241, .45);
          animation: pop .15s ease-out; transition: transform .1s;
        }
        .btn:hover { transform: scale(1.08); }
        .menu {
          display: none; margin-top: 6px; width: 280px; padding: 6px;
          background: rgba(24, 24, 36, .97); color: #ececf4;
          border: 1px solid #2a2a3c; border-radius: 12px;
          box-shadow: 0 12px 32px rgba(0, 0, 0, .35);
          backdrop-filter: blur(8px); animation: pop .15s ease-out;
        }
        .menu.open { display: block; }
        .head {
          padding: 6px 8px 8px; margin-bottom: 4px; border-bottom: 1px solid #2a2a3c;
          font-size: 11px; color: #8b8ba3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .head b { color: #c4b5fd; font-weight: 600; }
        .item {
          display: flex; align-items: center; gap: 8px; width: 100%;
          padding: 8px; border: none; border-radius: 8px; background: none;
          color: inherit; font: inherit; text-align: left; cursor: pointer;
        }
        .item:hover { background: rgba(139, 92, 246, .16); }
        .item span { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .item .q { color: #8b8ba3; }
        .item svg { flex-shrink: 0; color: #8b8ba3; }
        .item:hover svg { color: #c4b5fd; }
        .empty { padding: 10px 8px; color: #8b8ba3; font-size: 12px; }
        @keyframes pop { from { opacity: 0; transform: translateY(-4px) scale(.97); } }
      </style>
      <div class="wrap">
        <button class="btn" title="Show search suggestions">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
            <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
          </svg>
        </button>
        <div class="menu"></div>
      </div>
    `
    root.querySelector('.btn').addEventListener('click', toggleMenu)
    // Keep clicks on our button/menu from reaching the page's scripts (e.g. ad pop-ups)
    ;['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup'].forEach((type) =>
      host.addEventListener(type, (e) => e.stopPropagation()),
    )
    document.documentElement.appendChild(host)
  }

  async function toggleMenu() {
    const menu = root.querySelector('.menu')
    if (menu.classList.contains('open')) {
      menu.classList.remove('open')
      return
    }
    const { suggestions = [] } = await chrome.storage.local.get('suggestions')

    menu.innerHTML = ''
    const head = document.createElement('div')
    head.className = 'head'
    head.append('Search for ')
    const b = document.createElement('b')
    b.textContent = selectedText
    head.append(b)
    menu.appendChild(head)

    if (suggestions.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'empty'
      empty.textContent = 'No suggestions yet. Add some in the extension popup → Suggestions tab.'
      menu.appendChild(empty)
    }

    suggestions.forEach(({ text }) => {
      const query = `${selectedText} ${text}`
      const item = document.createElement('button')
      item.className = 'item'
      item.title = query
      item.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
        </svg>
        <span><span class="q"></span> <strong></strong></span>`
      // textContent (not innerHTML) so page text can never inject HTML
      item.querySelector('.q').textContent = selectedText
      item.querySelector('strong').textContent = text
      item.addEventListener('click', () => {
        const url = 'https://www.google.com/search?q=' + encodeURIComponent(query)
        chrome.runtime.sendMessage({ type: 'OPEN_URL', url })
        hide()
      })
      menu.appendChild(item)
    })
    menu.classList.add('open')
  }

  function show(rect) {
    if (!host) createUI()
    const wrap = root.querySelector('.wrap')
    wrap.style.top = `${rect.bottom + window.scrollY + 6}px`
    wrap.style.left = `${rect.left + window.scrollX}px`
    root.querySelector('.menu').classList.remove('open')
    host.style.display = 'block'
  }

  function hide() {
    if (host) host.style.display = 'none'
  }

  const isInsideUI = (e) => host && e.composedPath().includes(host)

  // Listen on `window` in the capture phase (the `true` argument) so our code runs
  // BEFORE the page's own scripts. Ad-heavy sites often stop mouse events from
  // reaching normal listeners, which made the button never appear.
  window.addEventListener(
    'mouseup',
    (e) => {
      if (isInsideUI(e)) return
      // Wait a tick so the browser finishes updating the selection
      setTimeout(() => {
        const selection = window.getSelection()
        const text = selection ? selection.toString().trim() : ''
        if (!text || text.length > MAX_TEXT_LENGTH || selection.rangeCount === 0) {
          hide()
          return
        }
        selectedText = text.replace(/\s+/g, ' ')
        show(selection.getRangeAt(0).getBoundingClientRect())
      }, 0)
    },
    true,
  )

  window.addEventListener(
    'mousedown',
    (e) => {
      if (!isInsideUI(e)) hide()
    },
    true,
  )

  window.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Escape') hide()
    },
    true,
  )
})()
