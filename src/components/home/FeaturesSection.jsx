import Reveal from '../common/Reveal'
import { cx, img } from '../../utils/helpers'

const FEATURES = [
  {
    icon: 'icon_01.png',
    title: ['Work During The', 'Pandemic'],
    delay: 0,
    border: true,
  },
  {
    icon: 'icon_02.png',
    title: ['Together We', 'Change Lives'],
    delay: 200,
    border: true,
  },
  {
    icon: 'icon_03.png',
    title: ['The smart Easy', 'Way To Give'],
    delay: 400,
    border: true,
  },
  {
    icon: 'icon_04.png',
    title: ['Be the Reason', 'Someone Smiles'],
    delay: 600,
    border: false,
  },
]

export default function FeaturesSection() {
  return (
    <div className="feature-block-one pt-45 lg-pt-10 pb-75 lg-pb-40">
      <div className="box-layout-one">
        <div className="row justify-content-center">
          {FEATURES.map((feature) => (
            <Reveal
              key={feature.icon}
              className="col-lg-3 col-6"
              anim="slide-up"
              duration={900}
              delay={feature.delay}
            >
              <div
                className={cx(
                  'card-style-one text-center position-relative z-1 tran3s mt-25',
                  feature.border && 'border-style'
                )}
              >
                <div className="icon m-auto rounded-circle d-flex align-items-center justify-content-center">
                  <img src={img(feature.icon)} alt="" className="m-auto" />
                </div>
                <h4>
                  {feature.title[0]} <br /> {feature.title[1]}
                </h4>
              </div>
              {/* /.card-style-one */}
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  )
}
