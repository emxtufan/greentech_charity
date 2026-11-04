import Counter from '../common/Counter'
import Reveal from '../common/Reveal'
import { EditableImage, EditableList, EditableText, useField } from '../editable'
import useContent from '../../hooks/useContent'
import { img } from '../../utils/helpers'

export const defaultData = {
  subtitle: 'Make A Difference Today',
  title: 'Make A Difference Today Join Mission ',
  text: 'There are many variations of passages of lorem Ipsum available, but the majority have suffered alteration dolore magna. We started charity in 2001 with a simple idea: to enable global philanthropy by empowering',
  amount: 1023,
  amountLabel: 'Dollar giving more than 15 years',
  amountPrefix: '$',
  amountSuffix: 'M',
  items: [
    'Our mission, vision, and the heart behind it all',
    'GivenGain is the global leader in online fundraising.',
  ],
  progressLabel: 'Success Case',
  progress: 65,
  count: 39976,
  countLabel: 'Project Done',
  countSuffix: '+',
  years: 12,
  image: 'img_09.jpg',
}

const SHAPES = [
  { src: 'shape_08.png', className: 'shape_01' },
  { src: 'shape_09.png', className: 'shape_02' },
  { src: 'shape_10.png', className: 'shape_03' },
  { src: 'shape_11.png', className: 'shape_04' },
]

export default function ImpactSection() {
  const { value: amount } = useField('amount')
  const { value: progress = 0 } = useField('progress')
  const { value: count } = useField('count')
  const { value: years } = useField('years')
  const { editMode } = useContent()

  return (
    <div className="feature-block-three position-relative z-1 pt-140 lg-pt-80 pb-140 lg-pb-80">
      <div className="container">
        <div className="row">
          <Reveal className="col-lg-7 d-flex order-lg-last" anim="slide-left" duration={900}>
            <div className="ps-lg-5 w-100">
              <div className="title-one mb-30">
                <EditableText field="subtitle" as="div" className="upper-title" />
                <EditableText field="title" as="h2" />
              </div>
              {/* /.title-one */}
              <EditableText field="text" as="p" />
              {(editMode || (amount !== '' && amount !== null && amount !== undefined)) && (
                <div className="card-one d-flex align-items-center mt-30 mb-50 lg-mb-30">
                  <div className="icon rounded-circle d-flex align-items-center justify-content-center">
                    <img src={img('icon_06.png')} alt="" />
                  </div>
                  <div className="text">
                    <div className="main-count font-amita">
                      <EditableText field="amountPrefix" />
                      <EditableText
                        field="amount"
                        numeric
                        render={(v) => (
                          <Counter end={v} decimals={Number.isInteger(Number(v)) ? 0 : 1} />
                        )}
                      />
                      <EditableText field="amountSuffix" />
                    </div>
                    <EditableText field="amountLabel" as="p" className="fs-16 fw-500" />
                  </div>
                </div>
              )}
              {/* /.card-one */}
              <EditableList
                field="items"
                as="ul"
                className="style-none list-style-two d-flex flex-wrap"
                renderItem={() => (
                  <li>
                    <EditableText as="span" />
                  </li>
                )}
              />
              {/* /.list-style-two */}

              {(editMode || Number(progress) > 0) && (
                <div className="sucess-score mt-35">
                  <EditableText field="progressLabel" as="p" />
                  <div className="progress-bar position-relative">
                    <div className="progress position-relative" style={{ width: `${progress}%` }}>
                      <span>{progress}%</span>
                    </div>
                  </div>
                  {/* /.progress-bar */}
                </div>
              )}
            </div>
          </Reveal>
          <Reveal
            className="col-lg-5 col-md-8 me-auto ms-auto d-flex"
            anim="slide-right"
            duration={900}
          >
            <EditableImage
              field="image"
              asBackground
              className="media-bg position-relative z-1 w-100"
            >
              {(editMode || count) && (
                <div className="card-one d-flex align-items-center">
                  <div className="icon rounded-circle d-flex align-items-center justify-content-center">
                    <img src={img('icon_05.png')} alt="" />
                  </div>
                  <div className="text">
                    <div className="main-count">
                      <EditableText
                        field="count"
                        numeric
                        render={(v) => (
                          <Counter end={v} decimals={Number.isInteger(Number(v)) ? 0 : 1} />
                        )}
                      />
                      <EditableText field="countSuffix" />
                    </div>
                    <EditableText field="countLabel" as="p" />
                  </div>
                </div>
              )}
              {/* /.card-one */}

              {(editMode || years) && (
                <div className="years">
                  <img src={img('sticker.png')} alt="" />
                  <EditableText field="years" numeric render={(v) => <Counter end={v} />} />
                </div>
              )}
            </EditableImage>
            {/* /.media-bg */}
          </Reveal>
        </div>
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
