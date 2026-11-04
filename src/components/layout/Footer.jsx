import { Link } from 'react-router-dom'
import { img } from '../../utils/helpers'
import {
  AddItemButton,
  EditableImage,
  EditableLink,
  EditableList,
  EditableParagraphs,
  EditableText,
  ListItem,
  Scope,
  useField,
} from '../editable'
import useContent from '../../hooks/useContent'

export const defaultFooter = {
  logo: 'logo-horizontal-light.png',
  text: 'GreenTech Charity vrea să construiască case modulare pentru persoane și familii care au nevoie de un loc sigur în care să locuiască.',
  linksTitle: 'Pagini',
  links: [
    { label: 'Povestea noastră', to: '/#poveste' },
    { label: 'Case modulare', to: '/case-modulare' },
    { label: 'Formularul 230', to: '/formular-230' },
    { label: 'Proiecte și noutăți', to: '/proiecte' },
    { label: 'Contact', to: '/contact' },
  ],
  contactTitle: 'Contact',
  contactMissing: 'Ne poți scrie prin formularul de pe pagina de contact.',
  socials: [],
  bottomLinks: [
    { label: 'Confidențialitate', to: '/confidentialitate' },
    { label: 'Date de identificare', to: '/contact#date-asociatie' },
  ],
  copyright: 'GreenTech Charity',
}

const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== ''

const socialNewItem = { icon: 'bi-facebook', to: 'https://', label: 'Facebook' }

export default function Footer() {
  return (
    <Scope path={['site', 'footer']}>
      <FooterContent />
    </Scope>
  )
}

function FooterContent() {
  const year = new Date().getFullYear()
  const { content } = useContent()
  const { value: socialsValue } = useField('socials')

  const contact = content?.site?.contact || {}
  const legal = content?.site?.legal || {}
  const socials = Array.isArray(socialsValue) ? socialsValue : []
  const hasContact =
    hasValue(contact.email) || hasValue(contact.phone) || hasValue(contact.address)

  return (
    <div id="footer" className="main-footer bg-one top-space">
      <div className="container">
        <div className="position-relative top-footer">
          <div className="row">
            <div className="col-lg-4">
              <div className="footer-intro mb-30 md-mb-50">
                <Link to="/">
                  <EditableImage field="logo" alt="GreenTech Charity" style={{ height: 70 }} />
                </Link>
                <EditableParagraphs field="text" className="mt-20 mb-30 fs-16" />
              </div>
            </div>
            <div className="col-lg-3 col-sm-6 offset-lg-1">
              <div className="footer-nav ps-xxl-4 mb-30">
                <EditableText field="linksTitle" as="h6" className="footer-title" />
                <EditableList
                  field="links"
                  as="ul"
                  className="footer-nav-link style-none"
                  renderItem={() => (
                    <li>
                      <EditableLink />
                    </li>
                  )}
                  newItem={{ label: 'Pagină', to: '/' }}
                />
              </div>
            </div>

            <div className="col-lg-4 col-sm-6">
              <div className="ps-xxl-4 mb-30">
                <EditableText field="contactTitle" as="h6" className="footer-title" />
                {hasContact ? (
                  <ul className="contact-info style-none">
                    {hasValue(contact.email) && (
                      <li>
                        <i className="bi bi-envelope me-2" />
                        <a href={`mailto:${contact.email}`}>{contact.email}</a>
                      </li>
                    )}
                    {hasValue(contact.phone) && (
                      <li>
                        <i className="bi bi-telephone me-2" />
                        <a href={`tel:${String(contact.phone).replace(/\s/g, '')}`}>
                          {contact.phone}
                        </a>
                      </li>
                    )}
                    {hasValue(contact.address) && (
                      <li>
                        <i className="bi bi-geo-alt me-2" />
                        {contact.address}
                      </li>
                    )}
                  </ul>
                ) : (
                  <EditableParagraphs field="contactMissing" />
                )}
                {socials.length > 0 && (
                  <ul className="style-none social-icon d-flex align-items-center mt-20">
                    {socials.map((social, index) => (
                      <ListItem key={index} field="socials" index={index}>
                        <li>
                          <EditableLink aria-label={social.label || social.icon}>
                            <i className={`bi ${social.icon}`} />
                          </EditableLink>
                        </li>
                      </ListItem>
                    ))}
                  </ul>
                )}
                <AddItemButton field="socials" newItem={socialNewItem} label="+ Rețea socială" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="container">
        <div className="bottom-footer">
          <div className="d-md-flex align-items-center justify-content-between">
            <div className="d-flex justify-content-center align-items-center sm-mb-10 order-md-last">
              <EditableList
                field="bottomLinks"
                as="ul"
                className="style-none d-flex justify-content-center"
                renderItem={() => (
                  <li>
                    <EditableLink />
                  </li>
                )}
              />
            </div>
            <p className="copyright-text text-center m0">
              ©{year} <EditableText field="copyright" />
            </p>
          </div>
          {hasValue(legal.name) && hasValue(legal.cif) && (
            <p className="small mt-10 mb-0" style={{ opacity: 0.7 }}>
              {legal.name} · CIF {legal.cif}
            </p>
          )}
        </div>
      </div>
      <img src={img('shape_18.png')} alt="" className="shapes shape_01" />
      <img src={img('shape_19.png')} alt="" className="shapes shape_02" />
    </div>
  )
}
