import Reveal from '../common/Reveal'
import { AddItemButton, EditableImage, EditableText, ListItem, useField } from '../editable'
import { cx } from '../../utils/helpers'

export const defaultData = {
  items: [
    {
      icon: 'icon_01.png',
      title: 'Work During The',
      title2: 'Pandemic',
      border: true,
    },
    {
      icon: 'icon_02.png',
      title: 'Together We',
      title2: 'Change Lives',
      border: true,
    },
    {
      icon: 'icon_03.png',
      title: 'The smart Easy',
      title2: 'Way To Give',
      border: true,
    },
    {
      icon: 'icon_04.png',
      title: 'Be the Reason',
      title2: 'Someone Smiles',
      border: false,
    },
  ],
}

export default function FeaturesSection() {
  const { value: items = [] } = useField('items')

  return (
    <div className="feature-block-one pt-45 lg-pt-10 pb-75 lg-pb-40">
      <div className="box-layout-one">
        <div className="row justify-content-center">
          {items.map((feature, index) => (
            <ListItem key={index} field="items" index={index}>
              <Reveal
                className="col-lg-3 col-6"
                anim="slide-up"
                duration={900}
                delay={index * 200}
              >
                <div
                  className={cx(
                    'card-style-one text-center position-relative z-1 tran3s mt-25',
                    feature.border && 'border-style'
                  )}
                >
                  <div className="icon m-auto rounded-circle d-flex align-items-center justify-content-center">
                    <EditableImage field="icon" alt="" className="m-auto" />
                  </div>
                  <h4>
                    <EditableText field="title" /> <br /> <EditableText field="title2" />
                  </h4>
                </div>
                {/* /.card-style-one */}
              </Reveal>
            </ListItem>
          ))}
        </div>
        <AddItemButton field="items" />
      </div>
    </div>
  )
}
