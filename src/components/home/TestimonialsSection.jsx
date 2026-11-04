import { useRef } from 'react'
import Carousel from '../common/Carousel'
import Reveal from '../common/Reveal'
import {
  AddItemButton,
  EditableImage,
  EditableText,
  ListItem,
  useField,
} from '../editable'
import { img } from '../../utils/helpers'

export const defaultData = {
  subtitle: 'Testimonial',
  title: 'Real feedback, Real results',
  items: [
    {
      id: 1,
      avatar: 'img_13.jpg',
      name: 'Elena M., Ukraine',
      role: 'Charity Volunteer',
      text: 'I never thought I’d be able to go back to school. Their support changed my life and gave me a future I can be proud of.',
    },
    {
      id: 2,
      avatar: 'img_13.jpg',
      name: 'John D., Canada',
      role: 'Charity Volunteer',
      text: 'I never thought I’d be able to go back to school. Their support changed my life and gave me a future I can be proud of.',
    },
    {
      id: 3,
      avatar: 'img_13.jpg',
      name: 'Aisha K., Kenya',
      role: 'Charity Volunteer',
      text: 'I never thought I’d be able to go back to school. Their support changed my life and gave me a future I can be proud of.',
    },
  ],
}

const SHAPES = [
  { src: 'shape_13.png', className: 'shape_01' },
  { src: 'shape_14.png', className: 'shape_02' },
  { src: 'img_14.jpg', className: 'rounded-circle shape_03' },
  { src: 'img_15.jpg', className: 'rounded-circle shape_04' },
  { src: 'img_16.jpg', className: 'rounded-circle shape_05' },
  { src: 'img_17.jpg', className: 'rounded-circle shape_06' },
]

export default function TestimonialsSection() {
  const { value: items = [] } = useField('items')
  const prevRef = useRef(null)
  const nextRef = useRef(null)

  return (
    <div className="feedback-section-one position-relative z-1 pt-130 lg-pt-80 pb-130 lg-pb-80">
      <div className="container">
        <Reveal className="title-one text-center mb-70 lg-mb-50" anim="slide-up" duration={900}>
          <EditableText field="subtitle" as="div" className="upper-title" />
          <EditableText field="title" as="h2" />
        </Reveal>
        {/* /.title-one */}

        <div className="row">
          <div className="col-lg-10 m-auto">
            <Carousel
              className="feedback-slider-one"
              items={items}
              slidesToShow={{ xs: 1, md: 1, xl: 1 }}
              autoplay={5000}
              prevRef={prevRef}
              nextRef={nextRef}
              renderItem={(testimonial, index) => (
                <ListItem field="items" index={index}>
                  <div className="feedback-wrapper">
                    <EditableImage
                      field="avatar"
                      alt=""
                      className="avatar rounded-circle m-auto"
                    />
                    <div className="bg-wrapper">
                      <div className="rating">
                        <ul className="style-none d-inline-flex justify-content-center">
                          {Array.from({ length: 5 }).map((_, starIndex) => (
                            <li key={starIndex}>
                              <i className="fa-solid fa-star"></i>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <EditableText field="text" as="blockquote" />

                      <div className="name-wrapper d-flex align-items-center justify-content-center mb-45">
                        <EditableText field="name" as="h5" className="name" />
                        <EditableText field="role" as="span" />
                      </div>

                      <img src={img('icon_09.png')} alt="icon" className="m-auto" />
                    </div>
                    {/* /.bg-wrapper */}
                  </div>
                </ListItem>
              )}
            />
            {/* /.feedback-slider-one */}
            <AddItemButton field="items" bulkImageField="avatar" />
          </div>
        </div>

        <ul className="slider-arrows d-flex justify-content-center style-none position-relative mt-60 md-mt-40">
          <li ref={prevRef} className="prev_a slick-arrow">
            <i className="fa-solid fa-chevron-left"></i>
          </li>
          <li ref={nextRef} className="next_a slick-arrow">
            <i className="fa-solid fa-chevron-right"></i>
          </li>
        </ul>
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
