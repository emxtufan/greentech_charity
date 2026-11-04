import Button from '../common/Button'
import Counter from '../common/Counter'
import Reveal from '../common/Reveal'
import { bg, img } from '../../utils/helpers'

const FEATURES = [
  {
    id: 1,
    title: 'Giving Love & Pair',
    text: 'Give everything of yourself to those you love and if there is anything left',
    background: '#fbf8e8',
  },
  {
    id: 2,
    title: 'Volunteering',
    text: 'Give everything of yourself to those you love and if there is anything left',
    background: '#e0f6ef',
  },
]

export default function DonateSection() {
  return (
    <div className="feature-block-four position-relative z-1 pt-150 lg-pt-80 pb-140 lg-pb-80">
      <div className="container">
        <div className="row">
          <Reveal className="col-lg-7" anim="slide-right" duration={900}>
            <div className="pe-xl-4">
              <div className="title-one mb-30">
                <img src={img('icon_10.png')} alt="" className="mb-20" />
                <h2>Donate Now To Make An Impact</h2>
              </div>
              {/* /.title-one */}

              <p>
                There are many variations of passages of lorem Ipsum available, but the majority
                have suffered alteration dolore magna. We started charity in 2001 with a simple
                idea: to enable global philanthropy by empowering
              </p>

              <div className="row">
                {FEATURES.map((feature) => (
                  <div className="col-lg-6" key={feature.id}>
                    <div className="feature-box mt-20" style={{ background: feature.background }}>
                      <div className="d-flex align-items-center">
                        <div className="icon rounded-circle"></div>
                        <h5>{feature.title}</h5>
                      </div>
                      <p className="fs-16">{feature.text}</p>
                    </div>
                    {/* /.feature-box */}
                  </div>
                ))}
              </div>
              <ul className="style-none d-flex flex-wrap align-items-center justify-content-between mt-30">
                <li className="mt-15">
                  <span>Let’s Raise $10,000 to Bring Water to 500 People</span>
                </li>
                <li>
                  <Button variant="two" size="xs" className="mt-15" to="/register">
                    Donation Now
                  </Button>
                </li>
              </ul>
            </div>
          </Reveal>
          <Reveal className="col-lg-5 col-md-8 me-auto ms-auto" anim="slide-left" duration={900}>
            <div className="media-bg rounded-circle" style={bg('img_18.jpg')}>
              <div className="card-one d-flex align-items-center">
                <div className="text">
                  <div className="main-count">
                    <Counter end={10} />k+
                  </div>
                  <p>Done homeless case</p>
                </div>
                <img src={img('icon_12.png')} alt="" className="icon" />
              </div>
              {/* /.card-one */}

              <img src={img('shape_15.png')} alt="shape" className="shapes shape_01" />
              <img src={img('shape_16.png')} alt="shape" className="shapes shape_02" />
            </div>
            {/* /.media-bg */}
          </Reveal>
        </div>
      </div>

      <img src={img('shape_17.png')} alt="shape" className="shapes shape_03" />
    </div>
  )
}
