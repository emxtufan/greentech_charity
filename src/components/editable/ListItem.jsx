import { cloneElement } from 'react'
import useContent from '../../hooks/useContent'
import { pathKey } from '../../utils/path'
import { Scope, useScopePath } from './Scope'

// children = un singur element; scope-ul devine [...listPath, index]
export default function ListItem({ field, index, children }) {
  const { editMode } = useContent()
  const listPath = useScopePath(field)

  const listProps = editMode
    ? { 'data-cms-list': pathKey(listPath), 'data-cms-index': index }
    : null

  return (
    <Scope path={[...listPath, index]}>
      {listProps ? cloneElement(children, listProps) : children}
    </Scope>
  )
}
