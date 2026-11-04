import Counter from '../common/Counter'
import Reveal from '../common/Reveal'
import { bg, img } from '../../utils/helpers'

const MISSION_LIST = [
  'Our mission, vision, and the heart behind it all',
  'GivenGain is the global leader in online fundraising.',
]

const SHAPES = [
  { src: 'shape_08.png', className: 'shape_01' },
  { src: 'shape_09.png', className: 'shape_02' },
  { src: 'shape_10.png', className: 'shape_03' },
  { src: 'shape_11.png', className: 'shape_04' },
]

export default function ImpactSection() {
  return (
    <div className="feature-block-three position-relative z-1 pt-140 lg-pt-80 pb-140 lg-pb-80">
      <div className="container">
        <div className="row">
          <Reveal className="col-lg-7 d-flex order-lg-last" anim="slide-left" duration={900}>
            <div className="ps-lg-5 w-100">
              <div className="title-one mb-30">
                <div className="upper-title">Make A Difference Today</div>
                <h2>Make A Difference Today Join Mission </h2>
              </div>
              {/* /.title-one */}
              <p>
                There are many variations of passages of lorem Ipsum available, but the majority
                have suffered alteration dolore magna. We started charity in 2001 with a simple
                idea: to enable global philanthropy by empowering
              </p>
              <div className="card-one d-flex align-items-center mt-30 mb-50 lg-mb-30">
                <div className="icon rounded-circle d-flex align-items-center justify-content-center">
                  <img src={img('icon_06.png')} alt="" />
                </div>
                <div className="text">
                  <div className="main-count font-amita">
                    $<Counter end={1023} />M
                  </div>
                  <p className="fs-16 fw-500">Dollar giving more than 15 years</p>
                </div>
              </div>
              {/* /.card-one */}
              <ul className="style-none list-style-two d-flex flex-wrap">
                {MISSION_LIST.map((item) => (
                  <li key={item}>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              {/* /.list-style-two */}

              <div className="sucess-score mt-35">
                <p>Success Case</p>
                <div className="progress-bar position-relative">
                  <div className="progress position-relative" style={{ width: '65%' }}>
                    <span>65%</span>
                  </div>
                </div>
                {/* /.progress-bar */}
              </div>
            </div>
          </Reveal>
          <Reveal
            className="col-lg-5 col-md-8 me-auto ms-auto d-flex"
            anim="slide-right"
            duration={900}
          >
            <div className="media-bg position-relative z-1 w-100" style={bg('img_09.jpg')}>
              <div className="card-one d-flex align-items-center">
                <div className="icon rounded-circle d-flex align-items-center justify-content-center">
                  <img src={img('icon_05.png')} alt="" />
                </div>
                <div className="text">
                  <div className="main-count">
                    <Counter end={39976} />+
                  </div>
                  <p>Project Done</p>
                </div>
              </div>
              {/* /.card-one */}

              <div className="years">
                <img src={img('sticker.png')} alt="" />
                <Counter end={12} />
              </div>
            </div>
            {/* /.media-bg */}
          </Reveal>
        </div>
      </div>

      {SHAPES.map((shape) => (
        <img
          key={shape.src}
          src={img(shape.src)}
          alt="Shape"
          className={`shapes ${shape.className}`}
        />
      ))}
    </div>
  )
}
