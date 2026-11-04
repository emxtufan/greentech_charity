import Counter from '../common/Counter'
import Reveal from '../common/Reveal'
import { EditableImage, EditableList, EditableLink, EditableText } from '../editable'
import { img } from '../../utils/helpers'

export const defaultData = {
  subtitle: 'About us',
  title: 'Together, We Create A Better Tomorrow',
  text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua',
  items: [
    'Raised For Charities',
    'Send a gift for childrens',
    'Registered Charities Supported',
    'Work During the Pandemic',
  ],
  text2:
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua',
  cta: { label: 'More About us', to: '/register' },
  image: 'img_04.jpg',
  count1: 40000,
  count1Label: 'children meals served',
  count1Suffix: '+',
  count2: 1.6,
  count2Label: 'Happy children',
  count2Suffix: 'mi+',
}

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
                <EditableText field="subtitle" as="div" className="upper-title" />
                <EditableText field="title" as="h2" />
              </div>
              {/* /.title-one */}
              <div className="row">
                <div className="col-xl-11">
                  <EditableText field="text" as="p" />
                  <EditableList
                    field="items"
                    as="ul"
                    className="style-none list-style-one d-flex flex-wrap pt-10"
                    renderItem={() => (
                      <li>
                        <EditableText as="span" />
                      </li>
                    )}
                  />
                  {/* /.list-style-one */}
                  <EditableText field="text2" as="p" className="mb-45 mt-30" />
                  <EditableLink field="cta" className="btn-two" />
                </div>
              </div>
            </div>
          </Reveal>
          <Reveal
            className="col-lg-5 col-md-8 me-auto ms-auto d-flex"
            anim="slide-left"
            duration={900}
          >
            <EditableImage
              field="image"
              asBackground
              className="media-bg position-relative z-1 w-100"
            >
              <div className="card-one d-flex align-items-center">
                <div className="icon rounded-circle d-flex align-items-center justify-content-center">
                  <img src={img('icon_05.png')} alt="" />
                </div>
                <div className="text">
                  <div className="main-count">
                    <EditableText field="count1" numeric render={(v) => <Counter end={v} />} />
                    <EditableText field="count1Suffix" />
                  </div>
                  <EditableText field="count1Label" as="p" />
                </div>
              </div>
              {/* /.card-one */}
              <div className="card-two text-center">
                <div className="main-count">
                  <EditableText
                    field="count2"
                    numeric
                    render={(v) => <Counter end={v} decimals={Number.isInteger(Number(v)) ? 0 : 1} />}
                  />
                  <EditableText field="count2Suffix" />
                </div>
                <EditableText field="count2Label" as="p" />
              </div>
              {/* /.card-two */}
            </EditableImage>
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
