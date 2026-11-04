import Counter from '../common/Counter'
import Reveal from '../common/Reveal'
import { AddItemButton, EditableText, ListItem, useField } from '../editable'

export const defaultData = {
  items: [
    {
      count: 768,
      prefix: '',
      suffix: '+',
      text: 'Registered Charities Supported',
    },
    {
      count: 461,
      prefix: '$',
      suffix: 'm',
      text: 'Raised For Over 2,700 Charities',
    },
    {
      count: 13,
      prefix: '',
      suffix: 'million',
      text: 'Receive Donation from worldwide',
    },
  ],
}

export default function StatsSection() {
  const { value: items = [] } = useField('items')

  return (
    <div className="pb-130 lg-pb-80">
      <div className="container">
        <div className="row justify-content-center">
          {items.map((_, index) => (
            <ListItem key={index} field="items" index={index}>
              <div className="col-md-4 col-sm-6">
                <Reveal
                  className="counter-block-one text-center mt-30"
                  anim="slide-up"
                  duration={900}
                  delay={index * 200}
                >
                  <div className="main-count">
                    <EditableText field="prefix" />
                    <EditableText
                      field="count"
                      numeric
                      render={(v) => (
                        <Counter end={v} decimals={Number.isInteger(Number(v)) ? 0 : 1} />
                      )}
                    />
                    <EditableText field="suffix" />
                  </div>
                  <EditableText field="text" as="p" />
                </Reveal>
                {/* /.counter-block-one */}
              </div>
            </ListItem>
          ))}
        </div>
        <AddItemButton field="items" />
      </div>
    </div>
  )
}
