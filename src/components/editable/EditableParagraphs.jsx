import useContent from '../../hooks/useContent'
import { pathKey } from '../../utils/path'
import { useField } from './Scope'

// text lung: paragrafele sunt separate prin linie (liniile) goală
export default function EditableParagraphs({ field, className, pClassName }) {
  const { editMode } = useContent()
  const { value, path } = useField(field)

  const paragraphs = String(value ?? '')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  const editProps = editMode
    ? { 'data-cms-path': pathKey(path), 'data-cms-type': 'text' }
    : null

  return (
    <div {...editProps} className={className}>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className={pClassName}>
          {paragraph}
        </p>
      ))}
    </div>
  )
}
