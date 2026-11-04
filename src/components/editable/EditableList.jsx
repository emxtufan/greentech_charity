import { useField } from './Scope'
import AddItemButton from './AddItemButton'
import ListItem from './ListItem'

export default function EditableList({
  field,
  as: As = 'div',
  className,
  renderItem,
  newItem,
  bulkImageField,
}) {
  const { value } = useField(field)
  const items = Array.isArray(value) ? value : []

  return (
    <>
      <As className={className}>
        {items.map((item, index) => (
          <ListItem key={index} field={field} index={index}>
            {renderItem(item, index)}
          </ListItem>
        ))}
      </As>
      <AddItemButton field={field} newItem={newItem} bulkImageField={bulkImageField} />
    </>
  )
}
