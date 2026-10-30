import { useEffect, useState } from 'react'
import { loadSuggestions, saveSuggestions } from './storage'
import { CheckIcon, CloseIcon, DeleteIcon, EditIcon } from './icons'

// Manage the texts that get appended to highlighted text.
// Example: highlight "React hooks" + suffix "tutorial" → search "React hooks tutorial"
export default function Suggestions() {
  const [suggestions, setSuggestions] = useState([])
  const [newText, setNewText] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')

  useEffect(() => {
    loadSuggestions().then(setSuggestions)
  }, [])

  const update = (next) => {
    setSuggestions(next)
    saveSuggestions(next)
  }

  const handleAdd = (e) => {
    e.preventDefault()
    if (!newText.trim()) return
    update([...suggestions, { id: crypto.randomUUID(), text: newText.trim() }])
    setNewText('')
  }

  const saveEdit = (id) => {
    if (!editText.trim()) return
    update(suggestions.map((s) => (s.id === id ? { ...s, text: editText.trim() } : s)))
    setEditingId(null)
  }

  return (
    <>
      <p className="hint">
        These texts are added after your highlighted text. <br />
        e.g. <b>React hooks</b> + <b>tutorial</b> → searches “React hooks tutorial”
      </p>

      <form className="row add-row" onSubmit={handleAdd}>
        <input placeholder="Text to append, e.g. tutorial" value={newText} onChange={(e) => setNewText(e.target.value)} />
        <button type="submit" className="primary" disabled={!newText.trim()}>
          Add
        </button>
      </form>

      {suggestions.length === 0 && <p className="empty">No suggestions yet. Add one above.</p>}

      <ul className="list">
        {suggestions.map((s) =>
          editingId === s.id ? (
            <li key={s.id} className="row item">
              <input
                autoFocus
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEdit(s.id)
                  if (e.key === 'Escape') setEditingId(null)
                }}
              />
              <button className="icon-btn success" title="Save" onClick={() => saveEdit(s.id)}>
                <CheckIcon />
              </button>
              <button className="icon-btn" title="Cancel" onClick={() => setEditingId(null)}>
                <CloseIcon />
              </button>
            </li>
          ) : (
            <li key={s.id} className="row item">
              <span className="text">
                <span className="muted">your text +</span> {s.text}
              </span>
              <button
                className="icon-btn"
                title="Edit"
                onClick={() => {
                  setEditingId(s.id)
                  setEditText(s.text)
                }}
              >
                <EditIcon />
              </button>
              <button className="icon-btn danger" title="Delete" onClick={() => update(suggestions.filter((x) => x.id !== s.id))}>
                <DeleteIcon />
              </button>
            </li>
          ),
        )}
      </ul>
    </>
  )
}
