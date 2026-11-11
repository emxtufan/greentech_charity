import { Fragment } from 'react'
import { EditableParagraphs, EditableText, Scope, useField } from '../editable'
import useContent from '../../hooks/useContent'
import { getIn } from '../../utils/path'
import { getSocialLinks } from '../../utils/social'

const contactRows = [
  { key: 'contact.email', label: 'Email', href: (value) => `mailto:${value}` },
  { key: 'contact.phone', label: 'Telefon', href: (value) => `tel:${value.replace(/\s/g, '')}` },
  { key: 'contact.address', label: 'Adresă' },
]

const legalRows = [
  { key: 'legal.name', label: 'Denumire' },
  { key: 'legal.cif', label: 'Cod de identificare fiscală' },
  { key: 'legal.registry', label: 'Înregistrare în Registrul asociațiilor și fundațiilor' },
  { key: 'legal.address', label: 'Sediu' },
  { key: 'legal.representative', label: 'Reprezentant legal' },
  { key: 'legal.iban', label: 'Cont bancar (IBAN)' },
  { key: 'legal.bank', label: 'Banca' },
]

const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== ''

export const defaultData = {
  anchor: 'date-asociatie',
  bg: 'light',
  eyebrow: 'Date',
  title: 'Titlu',
  intro: '',
  contactTitle: 'Contact',
  contactMissing: 'Datele de contact vor fi publicate aici.',
  legalTitle: 'Date de identificare',
  legalMissing: 'Datele de identificare vor fi publicate aici.',
}

export default function OrgInfo() {
  const { content, editMode } = useContent()
  const { value: anchor } = useField('anchor')
  const { value: bg } = useField('bg')

  const site = content?.site
  const socialLinks = getSocialLinks(content?.site || {})

  const renderCard = (titleField, rows, missingField) => {
    const visibleRows = editMode ? rows : rows.filter((row) => hasValue(getIn(site, row.key)))

    return (
      <div className="gt-info-card">
        <EditableText field={titleField} as="h4" />
        {visibleRows.length > 0 && (
          <Scope path={['site']}>
            <dl className="gt-info-list">
              {visibleRows.map((row) => {
                const value = getIn(site, row.key)

                return (
                  <Fragment key={row.key}>
                    <dt>{row.label}</dt>
                    <dd>
                      {editMode ? (
                        <EditableText field={row.key} render={(v) => v || '(necompletat)'} />
                      ) : row.href ? (
                        <a href={row.href(value)}>{value}</a>
                      ) : (
                        value
                      )}
                    </dd>
                  </Fragment>
                )
              })}
            </dl>
          </Scope>
        )}
        {(editMode || visibleRows.length === 0) && (
          <>
            <EditableParagraphs field={missingField} className="gt-text" />
            {editMode && <small className="text-muted">Text afișat când lipsesc datele</small>}
          </>
        )}
      </div>
    )
  }

  return (
    <section id={anchor || undefined} className={`gt-section gt-bg-${bg || 'light'}`}>
      <div className="container">
        <div className="title-one text-center">
          <EditableText field="eyebrow" as="div" className="upper-title font-amita" />
          <EditableText field="title" as="h2" />
        </div>
        <EditableParagraphs field="intro" className="gt-text gt-intro text-center" />
        <div className="row g-4 mt-30">
          <div className="col-lg-6">
            {renderCard('contactTitle', contactRows, 'contactMissing')}
            {socialLinks.length > 0 && (
              <ul className="gt-info-social">
                {socialLinks.map((item) => (
                  <li key={item.url}>
                    <a href={item.url} aria-label={item.label} target="_blank" rel="noopener noreferrer">
                      <i className={item.icon} aria-hidden="true" />
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="col-lg-6">{renderCard('legalTitle', legalRows, 'legalMissing')}</div>
        </div>
      </div>
    </section>
  )
}
