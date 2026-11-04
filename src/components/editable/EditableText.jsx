import useContent from '../../hooks/useContent'
import { pathKey } from '../../utils/path'
import { useField } from './Scope'

export default function EditableText({
  field,
  as: As = 'span',
  className,
  multiline,
  numeric,
  render,
  ...rest
}) {
  const { editMode } = useContent()
  const { value, path } = useField(field)

  const editProps = editMode
    ? { 'data-cms-path': pathKey(path), 'data-cms-type': numeric ? 'number' : 'text' }
    : null

  return (
    <As {...rest} {...editProps} className={className}>
      {render ? render(value) : value}
    </As>
  )
}
