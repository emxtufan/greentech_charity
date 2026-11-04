import { Link } from 'react-router-dom'
import { bg, img } from '../../utils/helpers'

const EXPLORE_LINKS = [
  { label: 'Charity', to: '/#causes' },
  { label: 'Donation', to: '/#causes' },
  { label: 'Fundrising', to: '/#causes' },
  { label: 'Our Campaign', to: '/#causes' },
  { label: 'Volunteer', to: '/register' },
  { label: 'About us', to: '/#about' },
]

const SOCIALS = ['fa-facebook-f', 'fa-twitter', 'fa-pinterest-p', 'fa-instagram']

const LATEST_POSTS = [
  {
    image: 'blog_img_05.jpg',
    date: '12 Nov 2025',
    title: '18 Best Charity Marketing Campaigns',
  },
  {
    image: 'blog_img_06.jpg',
    date: '12 Nov 2025',
    title: 'Charity Of The Month Golden Futures',
  },
]

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <div id="contact" className="main-footer bg-one top-space">
      <div className="container">
        <div className="position-relative top-footer">
          <div className="row">
            <div className="col-lg-3">
              <div className="footer-intro mb-30 md-mb-50">
                <Link to="/">
                  <img
                    src={img('logo-horizontal-light.png')}
                    alt="Greentech Charity"
                    style={{ height: 70 }}
                  />
                </Link>
                <p className="mt-20 mb-30 fs-16">
                  Our Greentech Charity at vero eos et accusamus et iusto odio dignissimos ducimus qui
                  blanditiis praesentium
                </p>
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
                <Link to="/#about" className="btn-three">
                  Join Now
                </Link>
              </div>
            </div>
            <div className="col-lg-2 col-md-3">
              <div className="footer-nav ps-xxl-4 mb-30">
                <h6 className="footer-title">Explore Link</h6>
                <ul className="footer-nav-link style-none">
                  {EXPLORE_LINKS.map((link) => (
                    <li key={link.label}>
                      <Link to={link.to}>{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="col-lg-3 col-md-5">
              <div className="ps-xxl-4 mb-30">
                <h6 className="footer-title">Support</h6>
                <ul className="contact-info style-none">
                  <li>
                    <div className="icon d-flex align-items-center justify-content-center rounded-circle">
                      <img src={img('icon_13.png')} alt="" />
                    </div>
                    <p className="m0 d-flex flex-column">
                      <a href="tel:+088112233455">+ 92 (888) 616110 000</a>
                      <a href="tel:+088112233455">+ 1 (954) 546-3403</a>
                    </p>
                  </li>
                  <li>
                    <div className="icon d-flex align-items-center justify-content-center rounded-circle">
                      <img src={img('icon_14.png')} alt="" />
                    </div>
                    101 Merritt 5, north tower 14851 New York, USA
                  </li>
                </ul>
              </div>
            </div>

            <div className="col-lg-4 col-md-4">
              <div className="footer-news mb-30 ps-xxl-4">
                <h6 className="footer-title">Latest Post</h6>
                <ul className="style-none">
                  {LATEST_POSTS.map((post) => (
                    <li key={post.title}>
                      <article className="d-flex align-items-center">
                        <figure className="post-img" style={bg(post.image)}></figure>
                        <div className="post-data">
                          <div className="date">{post.date}</div>
                          <h5 className="blog-title m0">
                            <Link to="/#blog" className="line-bg inverse">
                              {post.title}
                            </Link>
                          </h5>
                        </div>
                      </article>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="container">
        <div className="bottom-footer">
          <div className="d-md-flex align-items-center justify-content-between">
            <div className="d-flex justify-content-center align-items-center sm-mb-10 order-md-last">
              <ul className="style-none d-flex justify-content-center">
                <li>
                  <a href="#">Privacy &amp; Terms</a>
                </li>
                <li>
                  <a href="#">Cookies</a>
                </li>
                <li>
                  <Link to="/#contact">Contact Us</Link>
                </li>
              </ul>
            </div>
            <p className="copyright-text text-center m0">©{year} Greentech Charity. All Rights Reserved</p>
          </div>
        </div>
      </div>
      <img src={img('shape_18.png')} alt="" className="shapes shape_01" />
      <img src={img('shape_19.png')} alt="" className="shapes shape_02" />
    </div>
  )
}
