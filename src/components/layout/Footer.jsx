import { Link } from 'react-router-dom'
import useContent from '../../hooks/useContent'
import { img } from '../../utils/helpers'
import { getSocialLinks } from '../../utils/social'
import {
  AddItemButton,
  EditableImage,
  EditableLink,
  EditableList,
  EditableText,
  ListItem,
  Scope,
  useField,
} from '../editable'

export const defaultFooter = {
  logo: 'logo-horizontal-light.png',
  text: 'Our Greentech Charity at vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium',
  joinCta: { label: 'Join Now', to: '/#about' },
  exploreTitle: 'Explore Link',
  exploreLinks: [
    { label: 'Charity', to: '/#causes' },
    { label: 'Donation', to: '/#causes' },
    { label: 'Fundrising', to: '/#causes' },
    { label: 'Our Campaign', to: '/#causes' },
    { label: 'Volunteer', to: '/register' },
    { label: 'About us', to: '/#about' },
  ],
  supportTitle: 'Support',
  phones: ['+ 92 (888) 616110 000', '+ 1 (954) 546-3403'],
  address: '101 Merritt 5, north tower 14851 New York, USA',
  postsTitle: 'Latest Post',
  posts: [
    {
      image: 'blog_img_05.jpg',
      date: '12 Nov 2025',
      title: { label: '18 Best Charity Marketing Campaigns', to: '/#blog' },
    },
    {
      image: 'blog_img_06.jpg',
      date: '12 Nov 2025',
      title: { label: 'Charity Of The Month Golden Futures', to: '/#blog' },
    },
  ],
  bottomLinks: [
    { label: 'Privacy & Terms', to: '#' },
    { label: 'Cookies', to: '#' },
    { label: 'Contact Us', to: '/#contact' },
  ],
  copyright: 'Greentech Charity. All Rights Reserved',
}

const toText = (value) => (value === undefined || value === null ? '' : String(value).trim())

const telHref = (value) => `tel:${value.replace(/[^\d+]/g, '')}`

export default function Footer() {
  return (
    <Scope path={['site', 'footer']}>
      <FooterContent />
    </Scope>
  )
}

function FooterContent() {
  const year = new Date().getFullYear()
  const { content, editMode } = useContent()
  const { value: phones = [] } = useField('phones')
  const { value: address } = useField('address')

  const site = content?.site || {}
  const contactEmail = toText(site.contact?.email)
  const contactPhone = toText(site.contact?.phone)
  const contactAddress = toText(site.contact?.address) || toText(site.legal?.address)
  const socialLinks = getSocialLinks(site)

  return (
    <div id="contact" className="main-footer bg-one top-space">
      <div className="container">
        <div className="position-relative top-footer">
          <div className="row">
            <div className="col-lg-3">
              <div className="footer-intro mb-30 md-mb-50">
                <Link to="/">
                  <EditableImage field="logo" alt="Greentech Charity" style={{ height: 70 }} />
                </Link>
                <EditableText field="text" as="p" className="mt-20 mb-30 fs-16" />
                {socialLinks.length > 0 && (
                  <ul className="style-none social-icon d-flex align-items-center">
                    <li className="text-white">Social </li>
                    {socialLinks.map(({ key, label, icon, url }) => (
                      <li key={key}>
                        <a
                          href={url}
                          aria-label={label}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <i className={`fa-brands ${icon}`} aria-hidden="true"></i>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
                <EditableLink field="joinCta" className="btn-three" />
              </div>
            </div>
            <div className="col-lg-2 col-md-3">
              <div className="footer-nav ps-xxl-4 mb-30">
                <EditableText field="exploreTitle" as="h6" className="footer-title" />
                <EditableList
                  field="exploreLinks"
                  as="ul"
                  className="footer-nav-link style-none"
                  renderItem={() => (
                    <li>
                      <EditableLink />
                    </li>
                  )}
                />
              </div>
            </div>

            <div className="col-lg-3 col-md-5">
              <div className="ps-xxl-4 mb-30">
                <EditableText field="supportTitle" as="h6" className="footer-title" />
                <ul className="contact-info style-none">
                  {contactEmail && (
                    <li>
                      <div className="icon d-flex align-items-center justify-content-center rounded-circle">
                        <i className="fa-solid fa-envelope" aria-hidden="true"></i>
                      </div>
                      <p className="m0">
                        <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
                      </p>
                    </li>
                  )}
                  {contactPhone ? (
                    <li>
                      <div className="icon d-flex align-items-center justify-content-center rounded-circle">
                        <img src={img('icon_13.png')} alt="" />
                      </div>
                      <p className="m0">
                        <a href={telHref(contactPhone)}>{contactPhone}</a>
                      </p>
                    </li>
                  ) : (
                    (editMode || phones.length > 0) && (
                      <li>
                        <div className="icon d-flex align-items-center justify-content-center rounded-circle">
                          <img src={img('icon_13.png')} alt="" />
                        </div>
                        <p className="m0 d-flex flex-column">
                          {phones.map((phone, index) => (
                            <ListItem key={index} field="phones" index={index}>
                              <a href={`tel:${phone.replace(/[^\d+]/g, '')}`}>
                                <EditableText as="span" />
                              </a>
                            </ListItem>
                          ))}
                          <AddItemButton field="phones" />
                        </p>
                      </li>
                    )
                  )}
                  {contactAddress ? (
                    <li>
                      <div className="icon d-flex align-items-center justify-content-center rounded-circle">
                        <img src={img('icon_14.png')} alt="" />
                      </div>
                      <p className="m0">{contactAddress}</p>
                    </li>
                  ) : (
                    (editMode || address) && (
                      <li>
                        <div className="icon d-flex align-items-center justify-content-center rounded-circle">
                          <img src={img('icon_14.png')} alt="" />
                        </div>
                        <EditableText field="address" />
                      </li>
                    )
                  )}
                </ul>
              </div>
            </div>

            <div className="col-lg-4 col-md-4">
              <div className="footer-news mb-30 ps-xxl-4">
                <EditableText field="postsTitle" as="h6" className="footer-title" />
                <EditableList
                  field="posts"
                  as="ul"
                  className="style-none"
                  renderItem={() => (
                    <li>
                      <article className="d-flex align-items-center">
                        <EditableImage
                          field="image"
                          as="figure"
                          asBackground
                          className="post-img"
                        />
                        <div className="post-data">
                          <EditableText field="date" as="div" className="date" />
                          <h5 className="blog-title m0">
                            <EditableLink field="title" className="line-bg inverse" />
                          </h5>
                        </div>
                      </article>
                    </li>
                  )}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="container">
        <div className="bottom-footer">
          <div className="footer-bottom-content">
            <div className="footer-bottom-nav">
              <EditableList
                field="bottomLinks"
                as="ul"
                className="style-none footer-bottom-links"
                renderItem={() => (
                  <li>
                    <EditableLink />
                  </li>
                )}
              />
            </div>
            <p className="copyright-text">
              ©{year} <EditableText field="copyright" />
            </p>
          </div>
        </div>
      </div>
      <img src={img('shape_18.png')} alt="" className="shapes shape_01" />
      <img src={img('shape_19.png')} alt="" className="shapes shape_02" />
    </div>
  )
}
