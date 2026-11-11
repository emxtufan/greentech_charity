import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Button from '../common/Button'
import Modal from '../common/Modal'
import useContent from '../../hooks/useContent'
import contentService from '../../services/contentService'
import { isInternal, resolveImg } from '../../utils/helpers'
import { getIn, insertAt, moveItem, removeAt, toPath } from '../../utils/path'

const OVERLAY_Z_INDEX = 100000
const SELECTION_BOX_Z_INDEX = 99998
const SELECTION_BOX_PADDING = 3
const SELECTION_BAR_OFFSET = 44
const SELECTION_BAR_MARGIN = 8

const IGNORE_SELECTOR = '.cms-ui, .app-modal, .cms-add-btn'

const EDITOR_TITLES = {
  text: 'Editează text',
  number: 'Editează număr',
  link: 'Editează link',
  image: 'Editează imagine',
}

const TYPE_LABELS = {
  text: 'Text',
  number: 'Number',
  image: 'Image',
  link: 'Link',
  item: 'Item',
}

const sameItem = (a, b) => {
  if (a === b) return true
  return Boolean(a && b && a.list === b.list && a.index === b.index)
}

const rectOf = (el) => {
  if (!el) return null

  const rect = el.getBoundingClientRect()

  if (!rect || rect.width <= 0 || rect.height <= 0) return null

  return {
    top: rect.top,
    left: rect.left,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  }
}

function CmsEditor({ editor, onClose, onSave }) {
  const { type, value } = editor
  const textValue = value === undefined || value === null ? '' : String(value)
  const linkValue = value && typeof value === 'object' ? value : {}

  const [text, setText] = useState(type === 'link' ? String(linkValue.label ?? '') : textValue)
  const [to, setTo] = useState(String(linkValue.to ?? ''))
  const [imageUrl, setImageUrl] = useState(type === 'image' ? textValue : '')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const asTextarea = type === 'text' && (textValue.length > 80 || textValue.includes('\n'))

  const handleFile = async (event) => {
    const file = event.target.files && event.target.files[0]
    if (!file) return

    setUploading(true)
    setUploadError('')

    try {
      const url = await contentService.uploadImage(file)
      setImageUrl(url)
    } catch (error) {
      setUploadError(error.message || 'Încărcarea imaginii a eșuat')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = () => {
    if (type === 'link') {
      onSave({ label: text, to })
      return
    }

    if (type === 'number') {
      onSave(Number(text))
      return
    }

    if (type === 'image') {
      onSave(imageUrl.trim())
      return
    }

    onSave(text)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={EDITOR_TITLES[type] || EDITOR_TITLES.text}
      footer={
        <>
          <Button variant="two" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="one" onClick={handleSave} disabled={uploading}>
            Save
          </Button>
        </>
      }
    >
      {(type === 'text' || type === 'number') && (
        <div className="mb-3">
          <label className="form-label" htmlFor="cms-editor-value">
            Valoare
          </label>
          {asTextarea ? (
            <textarea
              id="cms-editor-value"
              className="form-control"
              rows={6}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          ) : (
            <input
              id="cms-editor-value"
              className="form-control"
              type={type === 'number' ? 'number' : 'text'}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          )}
        </div>
      )}

      {type === 'link' && (
        <>
          <div className="mb-3">
            <label className="form-label" htmlFor="cms-editor-label">
              Text link
            </label>
            <input
              id="cms-editor-label"
              className="form-control"
              type="text"
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="cms-editor-to">
              Destinație
            </label>
            <input
              id="cms-editor-to"
              className="form-control"
              type="text"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              placeholder="/pagina, /#sectiune, https://..."
            />
            <div className="form-text">
              Ex: /pagina, /#sectiune, https://...
            </div>
          </div>
        </>
      )}

      {type === 'image' && (
        <>
          <div className="mb-3">
            {imageUrl ? (
              <img
                src={resolveImg(imageUrl)}
                alt=""
                style={{ maxWidth: '100%', maxHeight: '220px', objectFit: 'contain' }}
              />
            ) : (
              <p className="text-muted mb-0">Nicio imagine setată.</p>
            )}
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="cms-editor-file">
              Încarcă imagine
            </label>
            <input
              id="cms-editor-file"
              className="form-control"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFile}
              disabled={uploading}
            />
            {uploading && <div className="form-text">Se încarcă...</div>}
            {uploadError && <div className="text-danger">{uploadError}</div>}
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="cms-editor-url">
              URL / nume fișier
            </label>
            <input
              id="cms-editor-url"
              className="form-control"
              type="text"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="/uploads/imagine.jpg, img_01.jpg, https://..."
            />
          </div>
        </>
      )}
    </Modal>
  )
}

export default function CmsOverlay() {
  const { content, editMode, update, mutateList } = useContent()
  const navigate = useNavigate()
  const onAdmin = useLocation().pathname.startsWith('/admin')
  const [selection, setSelection] = useState(null)
  const [itemParent, setItemParent] = useState(null)
  const [editor, setEditor] = useState(null)
  const boxRef = useRef(null)
  const barRef = useRef(null)
  const contentRef = useRef(content)
  const editorRef = useRef(false)

  // referințe pentru listenerele de document (fără re-înregistrare la fiecare randare)
  useEffect(() => {
    contentRef.current = content
  }, [content])

  useEffect(() => {
    editorRef.current = Boolean(editor)
  }, [editor])

  useEffect(() => {
    if (!editMode || onAdmin) return undefined

    document.body.classList.add('cms-edit-mode')

    return () => document.body.classList.remove('cms-edit-mode')
  }, [editMode, onAdmin])

  // ieșirea din edit mode deselectează
  useEffect(() => {
    if (editMode) return

    setSelection(null)
    setItemParent(null)
    setEditor(null)
  }, [editMode])

  // click = selectare, dblclick = selectare + editor, Esc = deselect
  useEffect(() => {
    if (!editMode || onAdmin) return undefined

    const selectField = (el) => {
      const path = el.dataset.cmsPath
      if (!path) return

      setSelection({ kind: 'field', path, type: el.dataset.cmsType || 'text' })
    }

    const openEditorFor = (el) => {
      const pathAttr = el.dataset.cmsPath
      if (!pathAttr) return

      const path = toPath(pathAttr)
      setEditor({ path, type: el.dataset.cmsType || 'text', value: getIn(contentRef.current, path) })
    }

    const handleClick = (event) => {
      const target = event.target

      if (!(target instanceof Element) || target.closest(IGNORE_SELECTOR)) return

      const fieldEl = target.closest('[data-cms-path]')

      if (fieldEl) {
        event.preventDefault()
        event.stopPropagation()
        selectField(fieldEl)
        return
      }

      const itemEl = target.closest('[data-cms-list]')

      if (itemEl) {
        event.preventDefault()
        event.stopPropagation()

        const list = itemEl.dataset.cmsList
        const index = Number(itemEl.dataset.cmsIndex)

        setSelection(list && Number.isInteger(index) ? { kind: 'item', list, index } : null)
        return
      }

      // nimic editabil → deselect, dar fără preventDefault (linkurile normale rămân funcționale)
      setSelection(null)
    }

    const handleDoubleClick = (event) => {
      const target = event.target

      if (!(target instanceof Element) || target.closest(IGNORE_SELECTOR)) return

      const fieldEl = target.closest('[data-cms-path]')

      if (!fieldEl) return

      event.preventDefault()
      event.stopPropagation()
      selectField(fieldEl)
      openEditorFor(fieldEl)
    }

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return
      if (editorRef.current) return

      setSelection(null)
    }

    document.addEventListener('click', handleClick, true)
    document.addEventListener('dblclick', handleDoubleClick, true)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('click', handleClick, true)
      document.removeEventListener('dblclick', handleDoubleClick, true)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [editMode, onAdmin])

  // urmărirea selecției: elementul e re-găsit la fiecare frame, apoi desenăm conturul + bara
  useLayoutEffect(() => {
    if (!selection) return undefined

    const findTarget = () => {
      if (selection.kind === 'field') {
        return document.querySelector(`[data-cms-path="${CSS.escape(selection.path)}"]`)
      }

      return document.querySelector(
        `[data-cms-list="${CSS.escape(selection.list)}"][data-cms-index="${selection.index}"]`
      )
    }

    const apply = () => {
      const el = findTarget()
      const rect = rectOf(el)

      if (!rect) {
        setSelection(null)
        return false
      }

      if (selection.kind === 'field') {
        const parentEl = el.closest('[data-cms-list]')
        const parent = parentEl
          ? { list: parentEl.dataset.cmsList, index: Number(parentEl.dataset.cmsIndex) }
          : null

        setItemParent((prev) => (sameItem(prev, parent) ? prev : parent))
      }

      const box = boxRef.current

      if (box) {
        box.style.top = `${rect.top - SELECTION_BOX_PADDING}px`
        box.style.left = `${rect.left - SELECTION_BOX_PADDING}px`
        box.style.width = `${rect.width + SELECTION_BOX_PADDING * 2}px`
        box.style.height = `${rect.height + SELECTION_BOX_PADDING * 2}px`
      }

      const bar = barRef.current

      if (bar) {
        const barWidth = bar.offsetWidth
        const barHeight = bar.offsetHeight
        const maxLeft = Math.max(SELECTION_BAR_MARGIN, window.innerWidth - barWidth - SELECTION_BAR_MARGIN)
        const maxTop = Math.max(SELECTION_BAR_MARGIN, window.innerHeight - barHeight - SELECTION_BAR_MARGIN)
        const left = Math.min(Math.max(SELECTION_BAR_MARGIN, rect.left), maxLeft)
        const above = rect.top - SELECTION_BAR_OFFSET
        const preferredTop =
          above < SELECTION_BAR_MARGIN ? rect.bottom + SELECTION_BAR_MARGIN : above
        const top = Math.min(Math.max(SELECTION_BAR_MARGIN, preferredTop), maxTop)

        bar.style.top = `${top}px`
        bar.style.left = `${left}px`
      }

      return true
    }

    let frame = 0

    const loop = () => {
      if (!apply()) return
      frame = requestAnimationFrame(loop)
    }

    apply()
    frame = requestAnimationFrame(loop)

    return () => cancelAnimationFrame(frame)
  }, [selection])

  const actions = !selection
    ? null
    : selection.kind === 'item'
      ? { list: selection.list, index: selection.index }
      : itemParent

  const typeLabel = selection
    ? selection.kind === 'item'
      ? TYPE_LABELS.item
      : TYPE_LABELS[selection.type] || TYPE_LABELS.text
    : ''

  const selectedValue =
    selection && selection.kind === 'field' ? getIn(content, toPath(selection.path)) : null

  const canOpen =
    Boolean(selection) &&
    selection.kind === 'field' &&
    selection.type === 'link' &&
    Boolean(selectedValue) &&
    typeof selectedValue === 'object' &&
    isInternal(selectedValue.to)

  const handleEditorSave = (nextValue) => {
    if (!editor) return

    update(editor.path, nextValue)
    setEditor(null)
  }

  const handleEdit = () => {
    if (!selection || selection.kind !== 'field') return

    const path = toPath(selection.path)

    setEditor({ path, type: selection.type || 'text', value: getIn(content, path) })
  }

  const handleOpen = () => {
    if (!selection || selection.kind !== 'field') return

    const value = getIn(content, toPath(selection.path))
    const to = value && typeof value === 'object' ? value.to : ''

    if (!isInternal(to)) return

    setSelection(null)
    navigate(to)
  }

  const runItemAction = (fn) => {
    if (!actions) return

    const { list, index } = actions

    if (!Number.isInteger(index)) return

    mutateList(toPath(list), (arr) => fn(arr, index))
  }

  const shiftItem = (delta) => {
    if (!actions) return

    const { list, index } = actions

    if (!Number.isInteger(index)) return

    const items = getIn(content, toPath(list))
    const length = Array.isArray(items) ? items.length : 0
    const nextIndex = Math.max(0, Math.min(Math.max(length - 1, 0), index + delta))

    mutateList(toPath(list), (arr) => moveItem(arr, index, nextIndex))

    if (selection.kind === 'item' && nextIndex !== index) {
      setSelection({ kind: 'item', list: selection.list, index: nextIndex })
    }
  }

  const handleMoveUp = () => shiftItem(-1)

  const handleMoveDown = () => shiftItem(1)

  const handleDuplicate = () =>
    runItemAction((arr, index) => insertAt(arr, index + 1, structuredClone(arr[index])))

  const handleRemove = () => {
    if (!actions) return
    if (!window.confirm('Ștergi acest element?')) return

    runItemAction((arr, index) => removeAt(arr, index))
    setSelection(null)
  }

  if (onAdmin) return null

  if (!editMode) return null

  return (
    <>
      {selection && (
        <>
          <div
            ref={boxRef}
            className="cms-ui cms-selection-box"
            style={{
              position: 'fixed',
              pointerEvents: 'none',
              border: '2px solid #2e8b57',
              borderRadius: 4,
              boxShadow: '0 0 0 4px rgba(46, 139, 87, .15)',
              zIndex: SELECTION_BOX_Z_INDEX,
            }}
          />
          <div
            ref={barRef}
            className="cms-ui cms-selection-bar"
            style={{ position: 'fixed', zIndex: OVERLAY_Z_INDEX }}
          >
            <span className="cms-sel-label">{typeLabel}</span>

            {selection.kind === 'field' && (
              <button type="button" className="cms-sel-btn primary" title="Edit" onClick={handleEdit}>
                ✎ Edit
              </button>
            )}

            {canOpen && (
              <button type="button" className="cms-sel-btn" title="Open" onClick={handleOpen}>
                ↗ Open
              </button>
            )}

            {actions && (
              <>
                <span className="cms-sel-sep" />
                <button
                  type="button"
                  className="cms-sel-btn"
                  aria-label="Move up"
                  title="Move up"
                  onClick={handleMoveUp}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="cms-sel-btn"
                  aria-label="Move down"
                  title="Move down"
                  onClick={handleMoveDown}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="cms-sel-btn"
                  aria-label="Duplicate"
                  title="Duplicate"
                  onClick={handleDuplicate}
                >
                  ⧉
                </button>
                <button
                  type="button"
                  className="cms-sel-btn"
                  aria-label="Delete"
                  title="Delete"
                  onClick={handleRemove}
                >
                  🗑
                </button>
              </>
            )}

            <span className="cms-sel-sep" />
            <button
              type="button"
              className="cms-sel-btn"
              aria-label="Deselect"
              title="Deselect"
              onClick={() => setSelection(null)}
            >
              ×
            </button>
          </div>
        </>
      )}

      {editor && (
        <CmsEditor editor={editor} onClose={() => setEditor(null)} onSave={handleEditorSave} />
      )}
    </>
  )
}
