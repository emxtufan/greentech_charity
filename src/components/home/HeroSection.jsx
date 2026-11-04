import Button from '../common/Button'
import Reveal from '../common/Reveal'
import { img } from '../../utils/helpers'

const AVATARS = ['img_01.jpg', 'img_02.jpg', 'img_03.jpg']

const SHAPES = ['shape_01', 'shape_02', 'shape_03']

export default function HeroSection() {
  return (
    <div className="hero-banner-one header-space-fix position-relative z-1 pt-140 lg-pt-120 sm-pt-90 pb-170 xl-pb-120 md-pb-100 sm-pb-70">
      <div className="box-layout-one">
        <div className="row">
          <div className="col-xl-5 col-md-6">
            <Reveal className="slogan font-amita fs-20" anim="slide-up" duration={900}>
              Change Starts With You
            </Reveal>
            <Reveal
              as="h1"
              className="hero-heading"
              anim="slide-up"
              duration={900}
              delay={300}
            >
              Be The Light In Someone’s Darkness
            </Reveal>
            <Reveal as="p" className="fs-20" anim="slide-up" duration={900} delay={500}>
              Donate, volunteer, and stand up for those who need your support today.
            </Reveal>
            <Reveal className="mt-35" anim="slide-up" duration={900} delay={700}>
              <Button to="/#causes">Donation Now</Button>
            </Reveal>
            <Reveal className="avatar-group mt-35" anim="slide-up" duration={900} delay={900}>
              <ul className="style-none d-flex align-items-center">
                {AVATARS.map((avatar) => (
                  <li key={avatar}>
                    <img src={img(avatar)} alt="" className="avatar rounded-circle" />
                  </li>
                ))}
                <li className="fs-20">Join 15000+ global partners who’ve reached</li>
              </ul>
            </Reveal>
            {/* /.avatar-group */}
          </div>
        </div>

        <Reveal className="media-wrapper" anim="slide-left" duration={900} delay={500}>
          <img src={img('img_04.png')} alt="Main Image" />
          <div className="card-wrapper d-flex align-items-center">
            <div className="icon rounded-circle d-flex align-items-center justify-content-center">
              <i className="fa-solid fa-arrow-up-right"></i>
            </div>
            <p className="font-amita">Join 1000+ People Donation</p>
          </div>
          {/* /.card-wrapper */}
          {SHAPES.map((shape) => (
            <img key={shape} src={img(`${shape}.png`)} alt="" className={`shapes ${shape}`} />
          ))}
        </Reveal>
        {/* /.media-wrapper */}
      </div>
    </div>
  )
}
