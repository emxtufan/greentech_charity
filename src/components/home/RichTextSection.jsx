import { EditableImage, EditableText, useField } from '../editable'
import useContent from '../../hooks/useContent'

export const defaultData = {
  title: 'New section',
  text: 'Write your text here.',
  image: '',
}

export default function RichTextSection() {
  const { editMode } = useContent()
  const { value: image } = useField('image')

  return (
    <div className="pt-120 lg-pt-80 pb-120 lg-pb-80">
      <div className="container">
        <EditableText field="title" as="h2" className="mb-30" />
        <EditableText field="text" as="p" style={{ whiteSpace: 'pre-line' }} />
        {(image || editMode) && (
          <EditableImage field="image" className="img-fluid rounded mt-40" />
        )}
      </div>
    </div>
  )
}
