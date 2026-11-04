import Button from '../common/Button'
import Counter from '../common/Counter'
import Reveal from '../common/Reveal'
import { bg, img } from '../../utils/helpers'

const ABOUT_LIST = [
  'Raised For Charities',
  'Send a gift for childrens',
  'Registered Charities Supported',
  'Work During the Pandemic',
]

export default function AboutSection() {
  return (
    <div
      id="about"
      className="feature-block-two position-relative z-1 pt-140 lg-pt-80 pb-100 lg-pb-60"
    >
      <div className="container">
        <div className="row">
          <Reveal className="col-lg-7 d-flex" anim="slide-right" duration={900}>
            <div className="pe-lg-5 w-100">
              <div className="title-one mb-30">
                <div className="upper-title">About us</div>
                <h2>Together, We Create A Better Tomorrow</h2>
              </div>
              {/* /.title-one */}
              <div className="row">
                <div className="col-xl-11">
                  <p>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor
                    incididunt ut labore et dolore magna aliqua
                  </p>
                  <ul className="style-none list-style-one d-flex flex-wrap pt-10">
                    {ABOUT_LIST.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  {/* /.list-style-one */}
                  <p className="mb-45 mt-30">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor
                    incididunt ut labore et dolore magna aliqua
                  </p>
                  <Button variant="two" to="/register">
                    More About us
                  </Button>
                </div>
              </div>
            </div>
          </Reveal>
          <Reveal
            className="col-lg-5 col-md-8 me-auto ms-auto d-flex"
            anim="slide-left"
            duration={900}
          >
            <div className="media-bg position-relative z-1 w-100" style={bg('img_04.jpg')}>
              <div className="card-one d-flex align-items-center">
                <div className="icon rounded-circle d-flex align-items-center justify-content-center">
                  <img src={img('icon_05.png')} alt="" />
                </div>
                <div className="text">
                  <div className="main-count">
                    <Counter end={40000} />+
                  </div>
                  <p>children meals served</p>
                </div>
              </div>
              {/* /.card-one */}
              <div className="card-two text-center">
                <div className="main-count">
                  <Counter end={1.6} decimals={1} />mi+
                </div>
                <p>Happy children </p>
              </div>
              {/* /.card-two */}
            </div>
            {/* /.media-bg */}
          </Reveal>
        </div>
      </div>

      <div className="shapes shape_01"></div>
      <img src={img('shape_04.png')} alt="Shape" className="shapes shape_02" />
      <img src={img('shape_05.png')} alt="Shape" className="shapes shape_03" />
      <img src={img('shape_06.png')} alt="Shape" className="shapes shape_04" />
    </div>
  )
}
