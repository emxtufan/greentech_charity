import { Link } from 'react-router-dom'
import Button from '../common/Button'
import Carousel from '../common/Carousel'
import Reveal from '../common/Reveal'
import { bg, img } from '../../utils/helpers'

const EVENTS = [
  {
    id: 1,
    image: 'img_10.jpg',
    date: '12 June 2025',
    title: 'Voices for Change: Benefit Concert',
    text: 'Lorem ipsum dolor sit amet event to consectetur adipiscing elit slacus ',
    time: '9.00 am - 2 pm',
    timeBg: '#cfe3dd',
    location: 'Nort Road, United State',
    locationBg: '#f9f2cd',
  },
  {
    id: 2,
    image: 'img_11.jpg',
    date: '12 June 2025',
    title: 'Hope in Action: Annual Charity Gala',
    text: 'Lorem ipsum dolor sit amet event to consectetur adipiscing elit slacus ',
    time: '9.00 am - 2 pm',
    timeBg: '#cfe3dd',
    location: 'Nort Road, United State',
    locationBg: '#f9f2cd',
  },
  {
    id: 3,
    image: 'img_12.jpg',
    date: '12 June 2025',
    title: 'Move for Good: Fitness for Fundraising',
    text: 'Lorem ipsum dolor sit amet event to consectetur adipiscing elit slacus ',
    time: '9.00 am - 2 pm',
    timeBg: '#cfe3dd',
    location: 'Nort Road, United State',
    locationBg: '#f9f2cd',
  },
  {
    id: 4,
    image: 'img_11.jpg',
    date: '12 June 2025',
    title: 'Hope in Action: Annual Charity Gala',
    text: 'Lorem ipsum dolor sit amet event to consectetur adipiscing elit slacus ',
    time: '9.00 am - 2 pm',
    timeBg: '#cfe3dd',
    location: 'Nort Road, United State',
    locationBg: '#f9f2cd',
  },
]

const EVENT_TAGS = ['Volunteer', 'Fundraise', 'Campaign', 'Humanity', 'Change Lives']

export default function EventsSection() {
  return (
    <div
      id="events"
      className="event-section-one position-relative z-1 pt-130 lg-pt-80"
    >
      <div className="container">
        <Reveal className="title-one text-center mb-70 lg-mb-50" anim="slide-up" duration={900}>
          <div className="upper-title">Events &amp; programs</div>
          <h2>Latest Upcoming Events</h2>
        </Reveal>
        {/* /.title-one */}
      </div>
      <div className="box-layout-one">
        <Carousel
          className="event-slider-one"
          items={EVENTS}
          slidesToShow={{ xs: 1, md: 2, xl: 3 }}
          autoplay
          renderItem={(event) => (
            <div className="card-style-three">
              <div className="d-flex flex-wrap">
                <div className="media-bg position-relative z-1" style={bg(event.image)}></div>
                <div className="text position-relative">
                  <div className="bg-wrapper position-relative h-100">
                    <div className="date">{event.date}</div>
                    <h4>
                      <Link to="/#events" className="line-bg">
                        {event.title}
                      </Link>
                    </h4>
                    <p>{event.text}</p>
                    <ul className="style-none">
                      <li>
                        <i className="fa-regular fa-clock"></i>{' '}
                        <span style={{ background: event.timeBg }}>{event.time}</span>
                      </li>
                      <li>
                        <i className="fa-regular fa-location-dot"></i>{' '}
                        <span style={{ background: event.locationBg }}>{event.location}</span>
                      </li>
                    </ul>

                    <Link to="/#events" className="details-cta d-flex align-items-center">
                      <div className="icon rounded-circle d-flex align-items-center justify-content-center tran3s">
                        <i className="fa-solid fa-angle-right"></i>
                      </div>
                      <span className="line-bg">Details Events</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        />

        <div className="text-center mt-65 md-mt-50">
          <Button variant="two" to="/#events">
            View more event
          </Button>
        </div>
      </div>
      {/* /.box-layout-one */}

      <div className="event-text-slider-bg mt-130 lg-mt-80">
        <div className="box-layout-one">
          <Carousel
            className="event-text-slider"
            items={EVENT_TAGS}
            slidesToShow={{ xs: 2, md: 3, xl: 5 }}
            autoplay={2500}
            renderItem={(tag) => (
              <div className="d-flex align-items-center justify-content-center">
                <img src={img('icon_08.png')} alt="icon" className="me-2" />
                <span>{tag}</span>
              </div>
            )}
          />
        </div>
        {/* /.box-layout-one */}
      </div>
      {/* /.event-text-slider-bg */}
    </div>
  )
}
