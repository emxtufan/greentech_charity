import ModularHouseIllustration from './ModularHouseIllustration'
import { EditableImage, EditableLink, EditableParagraphs, EditableText, useField } from '../editable'
import useContent from '../../hooks/useContent'

export const defaultData = {
  anchor: 'intro',
  eyebrow: 'Subtitlu',
  title: 'Titlu',
  text: 'Scrie aici textul.',
  primary: { label: 'Buton principal', to: '/' },
  secondary: { label: 'Buton secundar', to: '/' },
  image: '',
  imageNote: 'Scrie aici textul.',
}

export default function IntroHero({ bg }) {
  const { editMode } = useContent()
  const { value: anchor } = useField('anchor')
  const { value: image } = useField('image')

  return (
    <section id={anchor || undefined} className={`gt-intro-hero gt-bg-${bg || 'white'}`}>
      <div className="container">
        <div className="row align-items-center gy-5">
          <div className="col-lg-6">
            <EditableText field="eyebrow" as="div" className="upper-title font-amita mb-15" />
            <EditableText field="title" as="h1" className="gt-hero-title" />
            <EditableParagraphs field="text" className="gt-lead mt-25" />
            <div className="d-flex flex-wrap gap-3 mt-40">
              <EditableLink field="primary" className="btn-one" />
              <EditableLink field="secondary" className="btn-two" />
            </div>
          </div>
          <div className="col-lg-6">
            <figure className="gt-illustration m-0">
              {image ? (
                <EditableImage field="image" className="img-fluid rounded-4" />
              ) : (
                <>
                  <ModularHouseIllustration />
                  {editMode && <EditableImage field="image" />}
                </>
              )}
              <figcaption>
                <EditableText field="imageNote" />
              </figcaption>
            </figure>
          </div>
        </div>
      </div>
    </section>
  )
}
