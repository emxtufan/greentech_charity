import { Link } from 'react-router-dom'
import useContent from '../../hooks/useContent'
import { isInternal, safeHref } from '../../utils/helpers'
import { pathKey } from '../../utils/path'
import { useField } from './Scope'

export default function EditableLink({ field, className, children, ...rest }) {
  const { editMode } = useContent()
  const { value, path } = useField(field)

  const label = value?.label
  const to = value?.to ?? ''
  const content = children ?? label

  const editProps = editMode ? { 'data-cms-path': pathKey(path), 'data-cms-type': 'link' } : null

  if (isInternal(to)) {
    return (
      <Link {...rest} {...editProps} to={to} className={className}>
        {content}
      </Link>
    )
  }

  return (
    <a {...rest} {...editProps} href={safeHref(to)} className={className}>
      {content}
    </a>
  )
}
