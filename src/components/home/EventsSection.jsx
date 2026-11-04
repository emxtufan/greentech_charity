import Carousel from '../common/Carousel'
import Reveal from '../common/Reveal'
import {
  AddItemButton,
  EditableImage,
  EditableLink,
  EditableText,
  ListItem,
  useField,
} from '../editable'
import { img } from '../../utils/helpers'

export const defaultData = {
  subtitle: 'Events & programs',
  title: 'Latest Upcoming Events',
  cta: { label: 'View more event', to: '/#events' },
  items: [
    {
      id: 1,
      image: 'img_10.jpg',
      date: '12 June 2025',
      title: { label: 'Voices for Change: Benefit Concert', to: '/#events' },
      text: 'Lorem ipsum dolor sit amet event to consectetur adipiscing elit slacus ',
      time: '9.00 am - 2 pm',
      timeBg: '#cfe3dd',
      location: 'Nort Road, United State',
      locationBg: '#f9f2cd',
      cta: { label: 'Details Events', to: '/#events' },
    },
    {
      id: 2,
      image: 'img_11.jpg',
      date: '12 June 2025',
      title: { label: 'Hope in Action: Annual Charity Gala', to: '/#events' },
      text: 'Lorem ipsum dolor sit amet event to consectetur adipiscing elit slacus ',
      time: '9.00 am - 2 pm',
      timeBg: '#cfe3dd',
      location: 'Nort Road, United State',
      locationBg: '#f9f2cd',
      cta: { label: 'Details Events', to: '/#events' },
    },
    {
      id: 3,
      image: 'img_12.jpg',
      date: '12 June 2025',
      title: { label: 'Move for Good: Fitness for Fundraising', to: '/#events' },
      text: 'Lorem ipsum dolor sit amet event to consectetur adipiscing elit slacus ',
      time: '9.00 am - 2 pm',
      timeBg: '#cfe3dd',
      location: 'Nort Road, United State',
      locationBg: '#f9f2cd',
      cta: { label: 'Details Events', to: '/#events' },
    },
    {
      id: 4,
      image: 'img_11.jpg',
      date: '12 June 2025',
      title: { label: 'Hope in Action: Annual Charity Gala', to: '/#events' },
      text: 'Lorem ipsum dolor sit amet event to consectetur adipiscing elit slacus ',
      time: '9.00 am - 2 pm',
      timeBg: '#cfe3dd',
      location: 'Nort Road, United State',
      locationBg: '#f9f2cd',
      cta: { label: 'Details Events', to: '/#events' },
    },
  ],
  tags: ['Volunteer', 'Fundraise', 'Campaign', 'Humanity', 'Change Lives'],
}

export default function EventsSection() {
  const { value: items = [] } = useField('items')
  const { value: tags = [] } = useField('tags')

  return (
    <div
      id="events"
      className="event-section-one position-relative z-1 pt-130 lg-pt-80"
    >
      <div className="container">
        <Reveal className="title-one text-center mb-70 lg-mb-50" anim="slide-up" duration={900}>
          <EditableText field="subtitle" as="div" className="upper-title" />
          <EditableText field="title" as="h2" />
        </Reveal>
        {/* /.title-one */}
      </div>
      <div className="box-layout-one">
        <Carousel
          className="event-slider-one"
          items={items}
          slidesToShow={{ xs: 1, md: 1, xl: 2 }}
          autoplay
          renderItem={(event, index) => (
            <ListItem field="items" index={index}>
              <div className="card-style-three">
                <div className="d-flex flex-wrap">
                  <EditableImage
                    field="image"
                    asBackground
                    className="media-bg position-relative z-1"
                  />
                  <div className="text position-relative">
                    <div className="bg-wrapper position-relative h-100">
                      <EditableText field="date" as="div" className="date" />
                      <h4>
                        <EditableLink field="title" className="line-bg" />
                      </h4>
                      <EditableText field="text" as="p" multiline />
                      <ul className="style-none">
                        <li>
                          <i className="fa-regular fa-clock"></i>{' '}
                          <EditableText
                            field="time"
                            as="span"
                            style={{ background: event.timeBg }}
                          />
                        </li>
                        <li>
                          <i className="fa-regular fa-location-dot"></i>{' '}
                          <EditableText
                            field="location"
                            as="span"
                            style={{ background: event.locationBg }}
                          />
                        </li>
                      </ul>

                      <EditableLink field="cta" className="details-cta d-flex align-items-center">
                        <div className="icon rounded-circle d-flex align-items-center justify-content-center tran3s">
                          <i className="fa-solid fa-angle-right"></i>
                        </div>
                        <span className="line-bg">{event.cta?.label}</span>
                      </EditableLink>
                    </div>
                  </div>
                </div>
              </div>
            </ListItem>
          )}
        />
        <AddItemButton field="items" bulkImageField="image" />

        <div className="text-center mt-65 md-mt-50">
          <EditableLink field="cta" className="btn-two" />
        </div>
      </div>
      {/* /.box-layout-one */}

      <div className="event-text-slider-bg mt-130 lg-mt-80">
        <div className="box-layout-one">
          <Carousel
            className="event-text-slider"
            items={tags}
            slidesToShow={{ xs: 2, md: 3, xl: 5 }}
            autoplay={2500}
            renderItem={(tag, index) => (
              <ListItem field="tags" index={index}>
                <div className="d-flex align-items-center justify-content-center">
                  <img src={img('icon_08.png')} alt="icon" className="me-2" />
                  <EditableText as="span" />
                </div>
              </ListItem>
            )}
          />
          <AddItemButton field="tags" />
        </div>
        {/* /.box-layout-one */}
      </div>
      {/* /.event-text-slider-bg */}
    </div>
  )
}
