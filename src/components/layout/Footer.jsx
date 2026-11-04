import { Link } from 'react-router-dom'
import { img } from '../../utils/helpers'
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

const SOCIALS = ['fa-facebook-f', 'fa-twitter', 'fa-pinterest-p', 'fa-instagram']

export default function Footer() {
  return (
    <Scope path={['site', 'footer']}>
      <FooterContent />
    </Scope>
  )
}

function FooterContent() {
  const year = new Date().getFullYear()
  const { value: phones = [] } = useField('phones')

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
                <ul className="style-none social-icon d-flex align-items-center">
                  <li className="text-white">Social </li>
                  {SOCIALS.map((icon) => (
                    <li key={icon}>
                      <a href="#">
                        <i className={`fa-brands ${icon}`}></i>
                      </a>
                    </li>
                  ))}
                </ul>
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
                  <li>
                    <div className="icon d-flex align-items-center justify-content-center rounded-circle">
                      <img src={img('icon_14.png')} alt="" />
                    </div>
                    <EditableText field="address" />
                  </li>
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
        </div>
      </div>
      <img src={img('shape_18.png')} alt="" className="shapes shape_01" />
      <img src={img('shape_19.png')} alt="" className="shapes shape_02" />
    </div>
  )
}
