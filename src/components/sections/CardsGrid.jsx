import {
  AddItemButton,
  EditableLink,
  EditableParagraphs,
  EditableText,
  ListItem,
  useField,
} from '../editable'
import useContent from '../../hooks/useContent'

const newItem = {
  icon: 'bi-house-heart',
  title: 'Titlu',
  text: 'Scrie aici textul.',
  cta: { label: '', to: '' },
}

export const defaultData = {
  anchor: '',
  bg: 'white',
  eyebrow: 'Subtitlu',
  title: 'Titlu',
  intro: 'Scrie aici textul.',
  columns: 3,
  items: [
    { ...newItem, cta: { ...newItem.cta } },
    { ...newItem, cta: { ...newItem.cta } },
    { ...newItem, cta: { ...newItem.cta } },
  ],
  cta: { label: '', to: '' },
}

export default function CardsGrid() {
  const { editMode } = useContent()
  const { value: anchor } = useField('anchor')
  const { value: bg } = useField('bg')
  const { value: columns } = useField('columns')
  const { value: items = [] } = useField('items')
  const { value: cta } = useField('cta')

  const columnCount = [2, 3, 4].includes(Number(columns)) ? Number(columns) : 3

  return (
    <section id={anchor || undefined} className={`gt-section gt-bg-${bg || 'white'}`}>
      <div className="container">
        <div className="title-one text-center">
          <EditableText field="eyebrow" as="div" className="upper-title font-amita" />
          <EditableText field="title" as="h2" />
        </div>
        <EditableParagraphs field="intro" className="gt-text gt-intro text-center" />
        <div className="row g-4 mt-30">
          {items.map((item, index) => (
            <ListItem key={index} field="items" index={index}>
              <div className={`col-md-6 col-lg-${12 / columnCount}`}>
                <div className="gt-card">
                  <div className="gt-card-icon">
                    <i className={`bi ${item.icon}`} />
                  </div>
                  {editMode && <EditableText field="icon" as="small" className="text-muted mb-2" />}
                  <EditableText field="title" as="h4" />
                  <EditableParagraphs field="text" />
                  {(item.cta?.label || editMode) && (
                    <EditableLink field="cta" className="gt-card-link">
                      {item.cta?.label} <i className="bi bi-arrow-right" />
                    </EditableLink>
                  )}
                </div>
              </div>
            </ListItem>
          ))}
        </div>
        <AddItemButton field="items" newItem={newItem} />
        {(cta?.label || editMode) && (
          <div className="text-center mt-50">
            <EditableLink field="cta" className="btn-one" />
          </div>
        )}
      </div>
    </section>
  )
}
