import { Link } from 'react-router-dom'
import Carousel from '../common/Carousel'
import Reveal from '../common/Reveal'
import { bg, img } from '../../utils/helpers'

const CAUSES = [
  {
    id: 1,
    tag: 'Water',
    image: 'img_06.jpg',
    title: 'Warm Meals, Winter Food Drive',
    raised: '$25000',
    goal: 45000,
    progress: 55,
    percent: '30%',
    supporters: 1425,
  },
  {
    id: 2,
    tag: 'Food',
    image: 'img_07.jpg',
    title: 'Medical Camp in Rural Kenya',
    raised: '$25000',
    goal: 45000,
    progress: 55,
    percent: '30%',
    supporters: 1425,
  },
  {
    id: 3,
    tag: 'Poor',
    image: 'img_08.jpg',
    title: 'Child Sponsorship Program',
    raised: '$25000',
    goal: 45000,
    progress: 55,
    percent: '30%',
    supporters: 1425,
  },
  {
    id: 4,
    tag: 'Poor',
    image: 'img_07.jpg',
    title: 'Child Sponsorship Program',
    raised: '$25000',
    goal: 45000,
    progress: 55,
    percent: '30%',
    supporters: 1425,
  },
]

export default function CausesSection() {
  return (
    <div
      id="causes"
      className="causes-section-one position-relative z-1 pt-130 lg-pt-80 pb-100 lg-pb-80"
    >
      <div className="container">
        <Reveal className="title-one text-center mb-60 lg-mb-40" anim="slide-up" duration={900}>
          <div className="upper-title">Begin Giving To Them</div>
          <h2>Explore These Causes</h2>
        </Reveal>
        {/* /.title-one */}
      </div>
      <div className="box-layout-one">
        <Carousel
          className="causes-slider-one"
          items={CAUSES}
          slidesToShow={{ xs: 1, md: 2, xl: 3 }}
          autoplay
          dots
          renderItem={(cause) => (
            <div className="card-style-two">
              <div className="media-bg" style={bg(cause.image)}></div>
              <div className="info-meta position-relative z-1">
                <div className="tags">{cause.tag}</div>
                <h4>
                  <Link to="/#causes" className="line-bg">
                    {cause.title}
                  </Link>
                </h4>
                <p className="fs-16">Warm meals, warm hearts – winter food drive there are many</p>
                <div className="fs-16 fund-goal">
                  <span>{cause.raised}</span> raised of {cause.goal} goal
                </div>
                <div className="progress-bar position-relative">
                  <div
                    className="progress position-relative"
                    style={{ width: `${cause.progress}%` }}
                  >
                    <span>{cause.percent}</span>
                  </div>
                </div>
                {/* /.progress-bar */}
                <div className="supporters fs-16">Our active {cause.supporters} supporters </div>
                <img src={img('shape_07.png')} alt="shape" className="shapes shape_01" />
              </div>
              {/* /.info-meta */}
            </div>
          )}
        />
      </div>
      {/* /.box-layout-one */}
    </div>
  )
}
