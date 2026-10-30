import { useEffect, useRef, useState } from 'react'
import { DEFAULT_KEY_RATIO, loadItems, loadKeyRatio, saveItems, saveKeyRatio } from './storage'
import { CheckIcon, CloseIcon, CopyIcon, DeleteIcon, EditIcon } from './icons'
import Suggestions from './Suggestions'

// Key column on the left, value column on the right, with a draggable divider between them.
// `ratio` = how much of the width the key column takes (e.g. 0.33 = one third).
function Columns({ ratio, onResize, onResizeEnd, left, right }) {
  const colsRef = useRef(null)

  const ratioFromMouse = (e) => {
    const rect = colsRef.current.getBoundingClientRect()
    const r = (e.clientX - rect.left) / rect.width
    return Math.min(0.85, Math.max(0.15, r))
  }

  return (
    <div className="cols" ref={colsRef}>
      <div className="col" style={{ flex: ratio }}>{left}</div>
      <div
        className="divider"
        title="Drag to resize · double-click to reset"
        // Pointer capture keeps sending move events to the divider even when the mouse leaves it
        onPointerDown={(e) => {
          e.preventDefault()
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) onResize(ratioFromMouse(e))
        }}
        onPointerUp={(e) => {
          e.currentTarget.releasePointerCapture(e.pointerId)
          onResizeEnd(ratioFromMouse(e))
        }}
        onDoubleClick={() => onResizeEnd(DEFAULT_KEY_RATIO)}
      />
      <div className="col" style={{ flex: 1 - ratio }}>{right}</div>
    </div>
  )
}

function ClipboardStore() {
  const [items, setItems] = useState([])
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editKey, setEditKey] = useState('')
  const [editValue, setEditValue] = useState('')
  const [copiedId, setCopiedId] = useState(null)
  const [keyRatio, setKeyRatio] = useState(DEFAULT_KEY_RATIO)

  useEffect(() => {
    loadItems().then(setItems)
    loadKeyRatio().then(setKeyRatio)
  }, [])

  // While dragging only update the screen; save once when the mouse is released
  const resizeEnd = (ratio) => {
    setKeyRatio(ratio)
    saveKeyRatio(ratio)
  }
  const columnProps = { ratio: keyRatio, onResize: setKeyRatio, onResizeEnd: resizeEnd }

  const update = (next) => {
    setItems(next)
    saveItems(next)
  }

  const handleAdd = (e) => {
    e.preventDefault()
    if (!newKey.trim() || !newValue.trim()) return
    update([{ id: crypto.randomUUID(), key: newKey.trim(), value: newValue }, ...items])
    setNewKey('')
    setNewValue('')
  }

  const startEdit = (item) => {
    setEditingId(item.id)
    setEditKey(item.key)
    setEditValue(item.value)
  }

  const saveEdit = (id) => {
    if (!editKey.trim() || !editValue.trim()) return
    update(items.map((it) => (it.id === id ? { ...it, key: editKey.trim(), value: editValue } : it)))
    setEditingId(null)
  }

  // Enter = save, Escape = cancel while editing a row
  const editKeyDown = (e, id) => {
    if (e.key === 'Enter') saveEdit(id)
    if (e.key === 'Escape') setEditingId(null)
  }

  const handleDelete = (id) => {
    update(items.filter((it) => it.id !== id))
  }

  // copiedId is "<item id>-key" or "<item id>-value" so we know which icon to mark
  const copy = async (text, copyId) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(copyId)
    setTimeout(() => setCopiedId(null), 1200)
  }

  const CopyButton = ({ text, copyId }) => (
    <button className="icon-btn" title="Copy to clipboard" onClick={() => copy(text, copyId)}>
      {copiedId === copyId ? <span className="copied">✓</span> : <CopyIcon />}
    </button>
  )

  return (
    <>
      <form className="row add-row" onSubmit={handleAdd}>
        <Columns
          {...columnProps}
          left={<input placeholder="Key" value={newKey} onChange={(e) => setNewKey(e.target.value)} />}
          right={<input placeholder="Value" value={newValue} onChange={(e) => setNewValue(e.target.value)} />}
        />
        <button type="submit" className="primary" disabled={!newKey.trim() || !newValue.trim()}>
          Add
        </button>
      </form>

      {items.length === 0 && <p className="empty">No items yet. Add your first key/value above.</p>}

      <ul className="list">
        {items.map((item) =>
          editingId === item.id ? (
            <li key={item.id} className="row item">
              <Columns
                {...columnProps}
                left={
                  <input
                    autoFocus
                    value={editKey}
                    onChange={(e) => setEditKey(e.target.value)}
                    onKeyDown={(e) => editKeyDown(e, item.id)}
                  />
                }
                right={
                  <input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => editKeyDown(e, item.id)}
                  />
                }
              />
              <button className="icon-btn success" title="Save" onClick={() => saveEdit(item.id)}>
                <CheckIcon />
              </button>
              <button className="icon-btn" title="Cancel" onClick={() => setEditingId(null)}>
                <CloseIcon />
              </button>
            </li>
          ) : (
            <li key={item.id} className="row item">
              <Columns
                {...columnProps}
                left={
                  <div className="cell">
                    <span className="text key" title={item.key}>{item.key}</span>
                    <CopyButton text={item.key} copyId={`${item.id}-key`} />
                  </div>
                }
                right={
                  <div className="cell">
                    <span className="text" title={item.value}>{item.value}</span>
                    <CopyButton text={item.value} copyId={`${item.id}-value`} />
                  </div>
                }
              />
              <button className="icon-btn" title="Edit" onClick={() => startEdit(item)}>
                <EditIcon />
              </button>
              <button className="icon-btn danger" title="Delete" onClick={() => handleDelete(item.id)}>
                <DeleteIcon />
              </button>
            </li>
          ),
        )}
      </ul>
    </>
  )
}

export default function App() {
  const [tab, setTab] = useState('clipboard')

  return (
    <div className="app">
      <header className="header">
        <div className="logo">C</div>
        <div>
          <h1>Clipboard Formattor</h1>
          <p className="subtitle">Snippets &amp; smart search</p>
        </div>
      </header>
      <div className="tabs">
        <button className={tab === 'clipboard' ? 'tab active' : 'tab'} onClick={() => setTab('clipboard')}>
          Clipboard
        </button>
        <button className={tab === 'suggestions' ? 'tab active' : 'tab'} onClick={() => setTab('suggestions')}>
          Suggestions
        </button>
      </div>
      {tab === 'clipboard' ? <ClipboardStore /> : <Suggestions />}
    </div>
  )
}
