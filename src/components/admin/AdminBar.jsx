import { useEffect, useState } from 'react'
import useContent from '../../hooks/useContent'
import F230Panel from './F230Panel'
import MessagesPanel from './MessagesPanel'
import PagesPanel from './PagesPanel'

const BAR_PADDING = '70px'
const SAVED_TIMEOUT = 2000

export default function AdminBar() {
  const { isAdmin, editMode, setEditMode, dirty, canUndo, undo, discard, save, adminLogout } =
    useContent()

  const [pagesOpen, setPagesOpen] = useState(false)
  const [messagesOpen, setMessagesOpen] = useState(false)
  const [f230Open, setF230Open] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [barError, setBarError] = useState('')

  useEffect(() => {
    if (!isAdmin) return undefined

    document.body.style.paddingBottom = BAR_PADDING

    return () => {
      document.body.style.paddingBottom = ''
    }
  }, [isAdmin])

  useEffect(() => {
    if (!saved) return undefined

    const timer = setTimeout(() => setSaved(false), SAVED_TIMEOUT)

    return () => clearTimeout(timer)
  }, [saved])

  if (!isAdmin) return null

  const handleSave = async () => {
    setSaving(true)
    setBarError('')
    setSaved(false)

    try {
      await save()
      setSaved(true)
    } catch (error) {
      setBarError(error.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDiscard = async () => {
    if (!window.confirm('Discard all unsaved changes?')) return

    setBarError('')

    try {
      await discard()
    } catch (error) {
      setBarError(error.message || 'Discard failed')
    }
  }

  const handleLogout = () => {
    if (dirty && !window.confirm('You have unsaved changes. Log out anyway?')) return

    adminLogout()
  }

  return (
    <>
      <div className="cms-ui cms-admin-bar">
        <label className="cms-bar-switch" htmlFor="cms-edit-mode">
          <input
            id="cms-edit-mode"
            type="checkbox"
            checked={editMode}
            onChange={(event) => setEditMode(event.target.checked)}
          />
          <span>Edit mode</span>
        </label>

        <button type="button" className="cms-bar-btn" onClick={() => setPagesOpen(true)}>
          Pages
        </button>

        <button type="button" className="cms-bar-btn" onClick={() => setMessagesOpen(true)}>
          Mesaje
        </button>

        <button type="button" className="cms-bar-btn" onClick={() => setF230Open(true)}>
          Formulare 230
        </button>

        <button type="button" className="cms-bar-btn" onClick={undo} disabled={!canUndo}>
          Undo
        </button>

        <button type="button" className="cms-bar-btn" onClick={handleDiscard} disabled={!dirty}>
          Discard
        </button>

        <button
          type="button"
          className="cms-bar-btn primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : dirty ? 'Save*' : 'Save'}
        </button>

        {saved && <span className="cms-bar-saved">Saved ✓</span>}

        {barError && <span className="cms-bar-alert">{barError}</span>}

        <button type="button" className="cms-bar-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <PagesPanel open={pagesOpen} onClose={() => setPagesOpen(false)} />
      <MessagesPanel open={messagesOpen} onClose={() => setMessagesOpen(false)} />
      <F230Panel open={f230Open} onClose={() => setF230Open(false)} />
    </>
  )
}
