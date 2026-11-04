import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import useContent from '../../hooks/useContent'
import PagesPanel from './PagesPanel'

const BAR_PADDING = '70px'
const SAVED_TIMEOUT = 2000

export default function AdminBar() {
  const { isAdmin, editMode, setEditMode, dirty, canUndo, undo, discard, save, adminLogout } =
    useContent()

  const navigate = useNavigate()
  const onAdmin = useLocation().pathname.startsWith('/admin')

  const [pagesOpen, setPagesOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [barError, setBarError] = useState('')

  useEffect(() => {
    if (!isAdmin) return undefined

    if (onAdmin) {
      document.body.style.paddingBottom = ''
    } else {
      document.body.style.paddingBottom = BAR_PADDING
    }

    document.body.classList.add('cms-admin-active')

    return () => {
      document.body.style.paddingBottom = ''
      document.body.classList.remove('cms-admin-active')
    }
  }, [isAdmin, onAdmin])

  useEffect(() => {
    if (!saved) return undefined

    const timer = setTimeout(() => setSaved(false), SAVED_TIMEOUT)

    return () => clearTimeout(timer)
  }, [saved])

  if (onAdmin) return null
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

        <button type="button" className="cms-bar-btn" onClick={() => navigate('/admin')}>
          <i className="bi bi-speedometer2"></i> Dashboard
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
    </>
  )
}
