import { EditableLink, EditableParagraphs, EditableText, useField } from '../editable'
import useContent from '../../hooks/useContent'

export const defaultData = {
  anchor: '',
  title: 'Titlu',
  text: 'Scrie aici textul.',
  primary: { label: 'Buton principal', to: '/' },
  secondary: { label: 'Buton secundar', to: '/' },
}

export default function CtaBand() {
  const { editMode } = useContent()
  const { value: anchor } = useField('anchor')
  const { value: secondary } = useField('secondary')

  return (
    <section id={anchor || undefined} className="gt-section-sm">
      <div className="container">
        <div className="gt-cta-band">
          <div className="row align-items-center gy-4">
            <div className="col-lg-7">
              <EditableText field="title" as="h2" />
              <EditableParagraphs field="text" className="gt-cta-text" />
            </div>
            <div className="col-lg-5 d-flex flex-wrap gap-3 justify-content-lg-end">
              <EditableLink field="primary" className="gt-btn-yellow" />
              {(secondary?.label || editMode) && (
                <EditableLink field="secondary" className="gt-btn-outline-light" />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
