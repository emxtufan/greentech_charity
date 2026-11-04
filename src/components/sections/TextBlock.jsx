import { EditableImage, EditableLink, EditableParagraphs, EditableText, useField } from '../editable'
import useContent from '../../hooks/useContent'

export const defaultData = {
  anchor: '',
  bg: 'white',
  compact: false,
  eyebrow: 'Subtitlu',
  title: 'Titlu',
  text: 'Scrie aici textul.',
  image: '',
  imageNote: 'Scrie aici textul.',
  imagePosition: 'right',
  cta: { label: '', to: '' },
}

export default function TextBlock() {
  const { editMode } = useContent()
  const { value: anchor } = useField('anchor')
  const { value: bg } = useField('bg')
  const { value: compact } = useField('compact')
  const { value: image } = useField('image')
  const { value: imageNote } = useField('imageNote')
  const { value: imagePosition } = useField('imagePosition')
  const { value: cta } = useField('cta')

  const hasImage = !!image || editMode
  const imageFirst = imagePosition === 'left'

  const heading = (
    <div className="title-one">
      <EditableText field="eyebrow" as="div" className="upper-title font-amita" />
      <EditableText field="title" as="h2" />
    </div>
  )

  const ctaLink = (cta?.label || editMode) && (
    <EditableLink field="cta" className="btn-one mt-30" />
  )

  return (
    <section id={anchor || undefined} className={`gt-section gt-bg-${bg || 'white'}${compact ? ' gt-section-compact' : ''}`}>
      {hasImage ? (
        <div className="container">
          <div className="row align-items-center gy-5">
            <div className={`col-lg-6 ${imageFirst ? 'order-lg-2' : 'order-lg-1'}`}>
              {heading}
              <EditableParagraphs field="text" className="gt-text mt-30" />
              {ctaLink}
            </div>
            <div className={`col-lg-6 ${imageFirst ? 'order-lg-1' : 'order-lg-2'}`}>
              <figure className="gt-figure m-0">
                <EditableImage field="image" className="img-fluid" />
                {(imageNote || editMode) && (
                  <figcaption>
                    <EditableText field="imageNote" />
                  </figcaption>
                )}
              </figure>
            </div>
          </div>
        </div>
      ) : (
        <div className="container">
          <div className="row">
            <div className="col-lg-8">
              {heading}
              <EditableParagraphs field="text" className="gt-text mt-30" />
              {ctaLink}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
