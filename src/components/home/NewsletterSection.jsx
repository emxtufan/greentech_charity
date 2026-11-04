import { useState } from 'react'
import Modal from '../common/Modal'
import Reveal from '../common/Reveal'
import { isValidEmail } from '../../utils/helpers'

export default function NewsletterSection() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState(false)
  const [open, setOpen] = useState(false)

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!isValidEmail(email)) {
      setError(true)
      return
    }

    setError(false)
    setOpen(true)
    setEmail('')
  }

  return (
    <div className="fancy-banner-one position-relative z-2 style-one">
      <div className="box-layout-two">
        <div className="bg-wrapper position-relative z-1">
          <div className="container">
            <div className="row">
              <div className="col-xxl-8 col-xl-6 col-lg-7">
                <Reveal className="title-one mb-25 lg-mb-20" anim="slide-up" duration={900}>
                  <h2 className="text-white">Subscribe for Updates Stories &amp; Impact</h2>
                </Reveal>
                {/* /.title-one */}
                <p className="fw-500 text-white mb-50 lg-mb-30">
                  Subscribe our newsletter get the latest news other tips{' '}
                </p>
                <form action="#" className="position-relative z-1" onSubmit={handleSubmit}>
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                  <button>Subscribe</button>
                </form>
                {error && (
                  <div className="text-danger mt-2">Please enter a valid email address.</div>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* /.bg-wrapper */}
      </div>
      {/* /.box-layout-two */}

      <Modal open={open} title="Thank you!" onClose={() => setOpen(false)}>
        You are now subscribed to our updates.
      </Modal>
    </div>
  )
}
