import {
  AddItemButton,
  EditableParagraphs,
  EditableText,
  ListItem,
  useField,
} from '../editable'
import useContent from '../../hooks/useContent'

const newItem = {
  q: 'Întrebare',
  a: 'Răspuns.',
}

export const defaultData = {
  anchor: '',
  bg: 'white',
  eyebrow: 'Subtitlu',
  title: 'Titlu',
  intro: 'Scrie aici textul.',
  items: [{ ...newItem }],
}

export default function Faq() {
  const { editMode } = useContent()
  const { value: anchor } = useField('anchor')
  const { value: bg } = useField('bg')
  const { value: items = [] } = useField('items')

  return (
    <section id={anchor || undefined} className={`gt-section gt-bg-${bg || 'white'}`}>
      <div className="container">
        <div className="row">
          <div className="col-lg-9">
            <div className="title-one">
              <EditableText field="eyebrow" as="div" className="upper-title font-amita" />
              <EditableText field="title" as="h2" />
            </div>
            <EditableParagraphs field="intro" className="gt-text mt-20" />
            <div className="gt-faq mt-30">
              {items.map((item, index) => (
                <ListItem key={index} field="items" index={index}>
                  <details className="gt-faq-item" open={editMode || undefined}>
                    <summary>
                      <EditableText field="q" as="span" />
                      <i className="bi bi-plus-lg gt-faq-icon" />
                    </summary>
                    <EditableParagraphs field="a" className="gt-faq-answer gt-text" />
                  </details>
                </ListItem>
              ))}
            </div>
            <AddItemButton field="items" newItem={newItem} />
          </div>
        </div>
      </div>
    </section>
  )
}
