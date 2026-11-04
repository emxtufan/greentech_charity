import {
  AddItemButton,
  EditableParagraphs,
  EditableText,
  ListItem,
  useField,
} from '../editable'
import useContent from '../../hooks/useContent'

const newItem = {
  title: 'Titlu',
  text: 'Scrie aici textul.',
}

export const defaultData = {
  anchor: '',
  bg: 'white',
  eyebrow: 'Subtitlu',
  title: 'Titlu',
  intro: 'Scrie aici textul.',
  items: [{ ...newItem }, { ...newItem }, { ...newItem }],
  note: '',
}

export default function Steps() {
  const { editMode } = useContent()
  const { value: anchor } = useField('anchor')
  const { value: bg } = useField('bg')
  const { value: items = [] } = useField('items')
  const { value: note } = useField('note')

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
            <ol className="gt-steps">
              {items.map((item, index) => (
                <ListItem key={index} field="items" index={index}>
                  <li>
                    <span className="gt-step-num">{index + 1}</span>
                    <div>
                      <EditableText field="title" as="h5" />
                      <EditableParagraphs field="text" />
                    </div>
                  </li>
                </ListItem>
              ))}
            </ol>
            <AddItemButton field="items" newItem={newItem} />
            {(note || editMode) && (
              <div className="gt-note">
                <EditableParagraphs field="note" />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
