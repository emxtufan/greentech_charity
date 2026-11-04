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
  subtitle: 'Begin Giving To Them',
  title: 'Explore These Causes',
  items: [
    {
      id: 1,
      tag: 'Water',
      image: 'img_06.jpg',
      title: { label: 'Warm Meals, Winter Food Drive', to: '/#causes' },
      text: 'Warm meals, warm hearts – winter food drive there are many',
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
      title: { label: 'Medical Camp in Rural Kenya', to: '/#causes' },
      text: 'Warm meals, warm hearts – winter food drive there are many',
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
      title: { label: 'Child Sponsorship Program', to: '/#causes' },
      text: 'Warm meals, warm hearts – winter food drive there are many',
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
      title: { label: 'Child Sponsorship Program', to: '/#causes' },
      text: 'Warm meals, warm hearts – winter food drive there are many',
      raised: '$25000',
      goal: 45000,
      progress: 55,
      percent: '30%',
      supporters: 1425,
    },
  ],
}

export default function CausesSection() {
  const { value: items = [] } = useField('items')

  return (
    <div
      id="causes"
      className="causes-section-one position-relative z-1 pt-130 lg-pt-80 pb-100 lg-pb-80"
    >
      <div className="container">
        <Reveal className="title-one text-center mb-60 lg-mb-40" anim="slide-up" duration={900}>
          <EditableText field="subtitle" as="div" className="upper-title" />
          <EditableText field="title" as="h2" />
        </Reveal>
        {/* /.title-one */}
      </div>
      <div className="box-layout-one">
        <Carousel
          className="causes-slider-one"
          items={items}
          slidesToShow={{ xs: 1, md: 2, xl: 3 }}
          autoplay
          dots
          renderItem={(cause, index) => (
            <ListItem field="items" index={index}>
              <div className="card-style-two">
                <EditableImage field="image" asBackground className="media-bg" />
                <div className="info-meta position-relative z-1">
                  <EditableText field="tag" as="div" className="tags" />
                  <h4>
                    <EditableLink field="title" className="line-bg" />
                  </h4>
                  <EditableText field="text" as="p" className="fs-16" />
                  <div className="fs-16 fund-goal">
                    <EditableText field="raised" /> raised of{' '}
                    <EditableText field="goal" numeric /> goal
                  </div>
                  <div className="progress-bar position-relative">
                    <div
                      className="progress position-relative"
                      style={{ width: `${cause.progress}%` }}
                    >
                      <EditableText field="percent" as="span" />
                    </div>
                  </div>
                  {/* /.progress-bar */}
                  <div className="supporters fs-16">
                    Our active <EditableText field="supporters" numeric /> supporters{' '}
                  </div>
                  <img src={img('shape_07.png')} alt="shape" className="shapes shape_01" />
                </div>
                {/* /.info-meta */}
              </div>
            </ListItem>
          )}
        />
        <AddItemButton field="items" bulkImageField="image" />
      </div>
      {/* /.box-layout-one */}
    </div>
  )
}
