import { useState } from 'react'
import useContent from '../../hooks/useContent'
import contentService from '../../services/contentService'
import { cx } from '../../utils/helpers'
import { setIn, toPath } from '../../utils/path'
import { useField, useScopePath } from './Scope'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export default function AddItemButton({ field, newItem, label = '+ Add', bulkImageField }) {
  const { editMode, mutateList } = useContent()
  const listPath = useScopePath(field)
  const { value } = useField(field)
  const [isDrag, setIsDrag] = useState(false)
  const [progress, setProgress] = useState('')
  const [errors, setErrors] = useState([])

  if (!editMode) return null

  const items = Array.isArray(value) ? value : []

  const handleClick = () => {
    mutateList(listPath, (arr) => {
      const template = newItem ?? arr[arr.length - 1] ?? {}
      return [...arr, structuredClone(template)]
    })
  }

  const handleFiles = async (files) => {
    if (files.length === 0) return

    const uploaded = []
    const failed = []

    setErrors([])

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index]
      setProgress(`Uploading ${index + 1}/${files.length}…`)

      if (!IMAGE_TYPES.includes(file.type)) {
        failed.push({ name: file.name, message: 'format neacceptat (doar jpeg, png, webp, gif)' })
        continue
      }

      if (file.size > MAX_FILE_SIZE) {
        failed.push({ name: file.name, message: 'fișierul depășește 5MB' })
        continue
      }

      try {
        const url = await contentService.uploadImage(file)
        const template = structuredClone(newItem ?? items[items.length - 1] ?? {})
        uploaded.push(setIn(template, toPath(bulkImageField), url))
      } catch (error) {
        failed.push({ name: file.name, message: error.message || 'încărcarea a eșuat' })
      }
    }

    setProgress('')
    setErrors(failed)

    if (uploaded.length > 0) {
      mutateList(listPath, (arr) => [...arr, ...uploaded])
    }
  }

  const handleChange = (event) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    handleFiles(files)
  }

  const handleDragOver = (event) => {
    event.preventDefault()
    setIsDrag(true)
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setIsDrag(false)

    const files = Array.from(event.dataTransfer?.files ?? []).filter((file) =>
      file.type.startsWith('image/')
    )
    handleFiles(files)
  }

  return (
    <>
      <div className="cms-add-row">
        <button type="button" className="cms-add-btn" onClick={handleClick}>
          {label}
        </button>
        {bulkImageField && (
          <label
            className={cx('cms-add-btn', 'cms-bulk-btn', isDrag && 'is-drag')}
            onDragOver={handleDragOver}
            onDragLeave={() => setIsDrag(false)}
            onDrop={handleDrop}
          >
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif"
              hidden
              onChange={handleChange}
            />
            {progress || '⬆ Upload photos (or drop here)'}
          </label>
        )}
      </div>
      {bulkImageField && errors.length > 0 && (
        <div className="cms-bulk-errors">
          {errors.map((error, index) => (
            <div key={`${error.name}-${index}`}>
              {error.name}: {error.message}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
