import useContent from '../../hooks/useContent'
import { cx, resolveImg } from '../../utils/helpers'
import { pathKey } from '../../utils/path'
import { useField } from './Scope'

export default function EditableImage({
  field,
  asBackground = false,
  as: As = 'div',
  className,
  style,
  alt,
  children,
  ...rest
}) {
  const { editMode } = useContent()
  const { value, path } = useField(field)

  const editProps = editMode ? { 'data-cms-path': pathKey(path), 'data-cms-type': 'image' } : null

  if (asBackground) {
    return (
      <As
        {...rest}
        {...editProps}
        className={className}
        style={{ ...style, backgroundImage: `url(${resolveImg(value)})` }}
      >
        {children}
      </As>
    )
  }

  if (!value) {
    if (!editMode) return null
    return (
      <div
        {...rest}
        {...editProps}
        className={cx(className, 'cms-img-placeholder')}
        style={style}
      >
        + Add image
      </div>
    )
  }

  return (
    <img
      {...rest}
      {...editProps}
      src={resolveImg(value)}
      alt={alt}
      className={className}
      style={style}
    />
  )
}
