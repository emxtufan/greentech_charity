import { useEffect, useState } from 'react'
import Button from '../common/Button'
import Modal from '../common/Modal'
import useContent from '../../hooks/useContent'
import contentService from '../../services/contentService'
import { resolveImg } from '../../utils/helpers'
import { getIn, insertAt, moveItem, removeAt, toPath } from '../../utils/path'

const OVERLAY_Z_INDEX = 100000

const EDITOR_TITLES = {
  text: 'Editează text',
  number: 'Editează număr',
  link: 'Editează link',
  image: 'Editează imagine',
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
  const [hover, setHover] = useState({ target: null, item: null })
  const [position, setPosition] = useState({ target: null, item: null })
  const [editor, setEditor] = useState(null)

  useEffect(() => {
    if (!editMode) return undefined

    document.body.classList.add('cms-edit-mode')

    return () => document.body.classList.remove('cms-edit-mode')
  }, [editMode])

  // hover: ținta = cel mai apropiat [data-cms-path], itemul = cel mai apropiat [data-cms-list]
  useEffect(() => {
    if (!editMode) {
      setHover({ target: null, item: null })
      return undefined
    }

    const handleMouseOver = (event) => {
      const node = event.target

      if (!(node instanceof Element) || node.closest('.cms-ui')) return

      const targetEl = node.closest('[data-cms-path]')
      const itemEl = node.closest('[data-cms-list]')
      const nextTarget = rectOf(targetEl) ? targetEl : null
      const nextItem = rectOf(itemEl) ? itemEl : null

      setHover((prev) =>
        prev.target === nextTarget && prev.item === nextItem
          ? prev
          : { target: nextTarget, item: nextItem }
      )
    }

    document.addEventListener('mouseover', handleMouseOver)

    return () => document.removeEventListener('mouseover', handleMouseOver)
  }, [editMode])

  // repoziționare din getBoundingClientRect la scroll/resize și după modificări de conținut
  useEffect(() => {
    if (!editMode || (!hover.target && !hover.item)) {
      setPosition({ target: null, item: null })
      return undefined
    }

    const reposition = () => {
      setPosition({ target: rectOf(hover.target), item: rectOf(hover.item) })
    }

    reposition()
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)

    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [editMode, hover, content])

  const openEditor = () => {
    if (!hover.target) return

    const pathAttr = hover.target.getAttribute('data-cms-path')
    if (!pathAttr) return

    const path = toPath(pathAttr)
    const type = hover.target.getAttribute('data-cms-type') || 'text'

    setEditor({ path, type, value: getIn(content, path) })
  }

  const handleEditorSave = (nextValue) => {
    if (!editor) return

    update(editor.path, nextValue)
    setEditor(null)
  }

  const runItemAction = (fn) => {
    if (!hover.item) return

    const listPath = toPath(hover.item.getAttribute('data-cms-list'))
    const index = Number(hover.item.getAttribute('data-cms-index'))

    if (!Number.isInteger(index)) return

    mutateList(listPath, (arr) => fn(arr, index))
  }

  const handleMoveUp = () => runItemAction((arr, index) => moveItem(arr, index, index - 1))

  const handleMoveDown = () => runItemAction((arr, index) => moveItem(arr, index, index + 1))

  const handleDuplicate = () =>
    runItemAction((arr, index) => insertAt(arr, index + 1, structuredClone(arr[index])))

  const handleRemove = () => {
    if (!window.confirm('Ștergi acest element?')) return

    runItemAction((arr, index) => removeAt(arr, index))
  }

  if (!editMode) return null

  return (
    <>
      {position.target && (
        <button
          type="button"
          className="cms-ui cms-edit-btn"
          aria-label="Editează"
          title="Editează"
          onClick={openEditor}
          style={{
            top: position.target.top + 4,
            left: position.target.right - 36,
            position: 'fixed',
            zIndex: OVERLAY_Z_INDEX,
          }}
        >
          ✎
        </button>
      )}

      {position.item && (
        <div
          className="cms-ui cms-item-toolbar"
          style={{
            top: position.item.top + 4,
            left: position.item.left + 4,
            position: 'fixed',
            zIndex: OVERLAY_Z_INDEX,
          }}
        >
          <button type="button" className="cms-ui" aria-label="Mută mai sus" title="Mută mai sus" onClick={handleMoveUp}>
            ↑
          </button>
          <button type="button" className="cms-ui" aria-label="Mută mai jos" title="Mută mai jos" onClick={handleMoveDown}>
            ↓
          </button>
          <button type="button" className="cms-ui" aria-label="Duplică" title="Duplică" onClick={handleDuplicate}>
            ⧉
          </button>
          <button type="button" className="cms-ui" aria-label="Șterge" title="Șterge" onClick={handleRemove}>
            🗑
          </button>
        </div>
      )}

      {editor && (
        <CmsEditor editor={editor} onClose={() => setEditor(null)} onSave={handleEditorSave} />
      )}
    </>
  )
}
