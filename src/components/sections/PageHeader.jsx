import { EditableParagraphs, EditableText, useField } from '../editable'
import Reveal from '../common/Reveal'

export const defaultData = {
  anchor: 'page-header',
  eyebrow: 'Subtitlu',
  title: 'Titlu',
  text: 'Scrie aici textul.',
}

export default function PageHeader({ bg }) {
  const { value: anchor } = useField('anchor')

  return (
    <section id={anchor || undefined} className={`gt-page-header gt-bg-${bg || 'white'}`}>
      <div className="container">
        <Reveal className="gt-narrow">
          <EditableText field="eyebrow" as="div" className="upper-title font-amita mb-15" />
          <EditableText field="title" as="h1" className="gt-page-title" />
          <EditableParagraphs field="text" className="gt-lead mt-20" />
        </Reveal>
      </div>
    </section>
  )
}
