import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Reveal from '../common/Reveal'
import { EditableText, useField } from '../editable'
import useContent from '../../hooks/useContent'
import { isValidEmail } from '../../utils/helpers'
import { pathKey } from '../../utils/path'

export const defaultData = {
  title: 'Subscribe for Updates Stories & Impact',
  text: 'Subscribe our newsletter get the latest news other tips',
  placeholder: 'Email Address',
  button: 'Subscribe',
  errorText: 'Please enter a valid email address.',
  modalTitle: 'Thank you!',
  modalText: 'You are now subscribed to our updates.',
}

export default function NewsletterSection() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState(false)

  const navigate = useNavigate()
  const { editMode } = useContent()
  const p = useField('placeholder')

  const placeholderProps = editMode
    ? { 'data-cms-path': pathKey(p.path), 'data-cms-type': 'text' }
    : null

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!isValidEmail(email)) {
      setError(true)
      return
    }

    setError(false)
    navigate(`/contact?subiect=altceva&email=${encodeURIComponent(email)}`)
  }

  return (
    <div className="fancy-banner-one position-relative z-2 style-one">
      <div className="box-layout-two">
        <div className="bg-wrapper position-relative z-1">
          <div className="container">
            <div className="row">
              <div className="col-xxl-8 col-xl-6 col-lg-7">
                <Reveal className="title-one mb-25 lg-mb-20" anim="slide-up" duration={900}>
                  <EditableText field="title" as="h2" className="text-white" />
                </Reveal>
                {/* /.title-one */}
                <EditableText field="text" as="p" className="fw-500 text-white mb-50 lg-mb-30" />
                <form action="#" className="position-relative z-1" onSubmit={handleSubmit}>
                  <input
                    type="email"
                    placeholder={p.value}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    {...placeholderProps}
                  />
                  <EditableText field="button" as="button" type="submit" />
                </form>
                {error && (
                  <EditableText field="errorText" as="div" className="text-danger mt-2" />
                )}
              </div>
            </div>
          </div>
        </div>
        {/* /.bg-wrapper */}
      </div>
      {/* /.box-layout-two */}
    </div>
  )
}
