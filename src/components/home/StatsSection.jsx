import Counter from '../common/Counter'
import Reveal from '../common/Reveal'

const STATS = [
  {
    end: 768,
    suffix: '+',
    text: 'Registered Charities Supported',
    delay: 0,
  },
  {
    end: 461,
    prefix: '$',
    suffix: 'm',
    text: 'Raised For Over 2,700 Charities',
    delay: 200,
  },
  {
    end: 13,
    suffix: 'million',
    text: 'Receive Donation from worldwide',
    delay: 400,
  },
]

export default function StatsSection() {
  return (
    <div className="pb-130 lg-pb-80">
      <div className="container">
        <div className="row justify-content-center">
          {STATS.map((stat) => (
            <div className="col-md-4 col-sm-6" key={stat.text}>
              <Reveal
                className="counter-block-one text-center mt-30"
                anim="slide-up"
                duration={900}
                delay={stat.delay}
              >
                <div className="main-count">
                  <Counter end={stat.end} prefix={stat.prefix} suffix={stat.suffix} />
                </div>
                <p>{stat.text}</p>
              </Reveal>
              {/* /.counter-block-one */}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
