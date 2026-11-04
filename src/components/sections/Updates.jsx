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
  date: 'luna anul',
  status: 'În pregătire',
  title: 'Titlu',
  text: 'Ce s-a întâmplat.',
}

export const defaultData = {
  anchor: '',
  bg: 'white',
  eyebrow: 'Subtitlu',
  title: 'Titlu',
  intro: 'Scrie aici textul.',
  items: [],
  emptyText: 'Încă nu avem actualizări.',
  cta: { label: '', to: '' },
}

export default function Updates() {
  const { editMode } = useContent()
  const { value: anchor } = useField('anchor')
  const { value: bg } = useField('bg')
  const { value: items = [] } = useField('items')
  const { value: cta } = useField('cta')

  const showList = items.length > 0 || editMode

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
            {showList ? (
              <>
                <div className="gt-updates mt-30">
                  {items.map((item, index) => (
                    <ListItem key={index} field="items" index={index}>
                      <article className="gt-update">
                        <div className="d-flex gap-3 align-items-center mb-10">
                          <EditableText field="date" as="span" className="gt-update-date" />
                          <EditableText field="status" as="span" className="gt-badge" />
                        </div>
                        <EditableText field="title" as="h5" />
                        <EditableParagraphs field="text" className="gt-text" />
                      </article>
                    </ListItem>
                  ))}
                </div>
                {editMode && (
                  <div className="gt-note mt-30">
                    <small className="text-muted mb-2">
                      Text afișat când nu există actualizări
                    </small>
                    <EditableParagraphs field="emptyText" />
                  </div>
                )}
              </>
            ) : (
              <div className="gt-note mt-30">
                <EditableParagraphs field="emptyText" />
              </div>
            )}
            <AddItemButton field="items" newItem={newItem} />
            {(cta?.label || editMode) && (
              <EditableLink field="cta" className="btn-two mt-30" />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
