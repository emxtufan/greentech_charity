import useContent from '../../hooks/useContent'
import { useScopePath } from './Scope'

export default function AddItemButton({ field, newItem, label = '+ Add' }) {
  const { editMode, mutateList } = useContent()
  const listPath = useScopePath(field)

  if (!editMode) return null

  const handleClick = () => {
    mutateList(listPath, (arr) => {
      const template = newItem ?? arr[arr.length - 1] ?? {}
      return [...arr, structuredClone(template)]
    })
  }

  return (
    <button type="button" className="cms-add-btn" onClick={handleClick}>
      {label}
    </button>
  )
}
