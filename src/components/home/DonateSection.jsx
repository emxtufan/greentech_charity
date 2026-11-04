import Counter from '../common/Counter'
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
  title: 'Donate Now To Make An Impact',
  text: 'There are many variations of passages of lorem Ipsum available, but the majority have suffered alteration dolore magna. We started charity in 2001 with a simple idea: to enable global philanthropy by empowering',
  features: [
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
  ],
  goalText: 'Let’s Raise $10,000 to Bring Water to 500 People',
  cta: { label: 'Donation Now', to: '/register' },
  image: 'img_18.jpg',
  count: 10,
  countLabel: 'Done homeless case',
}

export default function DonateSection() {
  const { value: features = [] } = useField('features')

  return (
    <div className="feature-block-four position-relative z-1 pt-150 lg-pt-80 pb-140 lg-pb-80">
      <div className="container">
        <div className="row">
          <Reveal className="col-lg-7" anim="slide-right" duration={900}>
            <div className="pe-xl-4">
              <div className="title-one mb-30">
                <img src={img('icon_10.png')} alt="" className="mb-20" />
                <EditableText field="title" as="h2" />
              </div>
              {/* /.title-one */}

              <EditableText field="text" as="p" />

              <div className="row">
                {features.map((feature, index) => (
                  <ListItem key={index} field="features" index={index}>
                    <div className="col-lg-6">
                      <div className="feature-box mt-20" style={{ background: feature.background }}>
                        <div className="d-flex align-items-center">
                          <div className="icon rounded-circle"></div>
                          <EditableText field="title" as="h5" />
                        </div>
                        <EditableText field="text" as="p" className="fs-16" />
                      </div>
                      {/* /.feature-box */}
                    </div>
                  </ListItem>
                ))}
              </div>
              <AddItemButton field="features" />
              <ul className="style-none d-flex flex-wrap align-items-center justify-content-between mt-30">
                <li className="mt-15">
                  <EditableText field="goalText" as="span" />
                </li>
                <li>
                  <EditableLink field="cta" className="btn-two xs mt-15" />
                </li>
              </ul>
            </div>
          </Reveal>
          <Reveal className="col-lg-5 col-md-8 me-auto ms-auto" anim="slide-left" duration={900}>
            <EditableImage field="image" asBackground className="media-bg rounded-circle">
              <div className="card-one d-flex align-items-center">
                <div className="text">
                  <div className="main-count">
                    <EditableText field="count" numeric render={(v) => <Counter end={v} />} />
                    k+
                  </div>
                  <EditableText field="countLabel" as="p" />
                </div>
                <img src={img('icon_12.png')} alt="" className="icon" />
              </div>
              {/* /.card-one */}

              <img src={img('shape_15.png')} alt="shape" className="shapes shape_01" />
              <img src={img('shape_16.png')} alt="shape" className="shapes shape_02" />
            </EditableImage>
            {/* /.media-bg */}
          </Reveal>
        </div>
      </div>

      <img src={img('shape_17.png')} alt="shape" className="shapes shape_03" />
    </div>
  )
}
