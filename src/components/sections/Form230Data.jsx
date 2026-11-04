import { Fragment, useState } from 'react'
import { EditableLink, EditableParagraphs, EditableText, Scope, useField } from '../editable'
import useContent from '../../hooks/useContent'
import { getIn } from '../../utils/path'

const rows = [
  { key: 'legal.name', label: 'Denumire' },
  { key: 'legal.cif', label: 'Cod de identificare fiscală' },
  { key: 'legal.iban', label: 'Cont bancar (IBAN)' },
]

const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== ''

export const defaultData = {
  anchor: 'datele-noastre',
  bg: 'mint',
  eyebrow: 'Date',
  title: 'Titlu',
  text: '',
  missingText: 'Datele vor fi publicate aici.',
  pdf: { label: 'Formularul oficial', to: 'https://www.anaf.ro' },
  guide: { label: '', to: '' },
  anafInfo: { label: '', to: '#informatii-anaf' },
  deadlineNote: '',
}

export default function Form230Data() {
  const { content, editMode } = useContent()
  const { value: anchor } = useField('anchor')
  const { value: bg } = useField('bg')
  const { value: guide } = useField('guide')
  const { value: anafInfo } = useField('anafInfo')
  const { value: deadlineNote } = useField('deadlineNote')
  const [copied, setCopied] = useState(null)

  const legal = content.site?.legal || {}
  // cheile din rows sunt absolute ("legal.name"), valorile stau în content.site
  const valueOf = (key) => getIn(legal, key.replace(/^legal\./, ''))

  const ready = !!(legal.cif && legal.iban)
  const showList = ready || editMode
  const visibleRows = editMode ? rows : rows.filter((row) => hasValue(valueOf(row.key)))

  const copy = (key, value) => () => {
    navigator.clipboard
      ?.writeText(value)
      .then(() => {
        setCopied(key)
        setTimeout(() => setCopied(null), 2000)
      })
      .catch(() => {})
  }

  return (
    <section id={anchor || undefined} className={`gt-section gt-bg-${bg || 'mint'}`}>
      <div className="container">
        <div className="row">
          <div className="col-lg-9">
            <div className="title-one">
              <EditableText field="eyebrow" as="div" className="upper-title font-amita" />
              <EditableText field="title" as="h2" />
            </div>
            <EditableParagraphs field="text" className="gt-text mt-20" />
            <div className="gt-info-card mt-30">
              {showList && (
                <Scope path={['site']}>
                  <dl className="gt-info-list">
                    {visibleRows.map((row) => {
                      const value = valueOf(row.key)

                      return (
                        <Fragment key={row.key}>
                          <dt>{row.label}</dt>
                          <dd>
                            {editMode ? (
                              <EditableText field={row.key} render={(v) => v || '(necompletat)'} />
                            ) : (
                              <>
                                {value}
                                <button
                                  type="button"
                                  className="gt-copy-btn"
                                  onClick={copy(row.key, value)}
                                >
                                  {copied === row.key ? 'Copiat' : 'Copiază'}
                                </button>
                              </>
                            )}
                          </dd>
                        </Fragment>
                      )
                    })}
                  </dl>
                </Scope>
              )}
              {!ready && (
                <div className={`gt-note${showList ? ' mt-20' : ''}`}>
                  <EditableParagraphs field="missingText" />
                  {editMode && (
                    <small className="text-muted">
                      Text afișat cât timp lipsesc CIF-ul sau IBAN-ul
                    </small>
                  )}
                </div>
              )}
            </div>
            <div className="d-flex flex-wrap gap-3 mt-30">
              <EditableLink
                field="pdf"
                className="btn-one"
                target="_blank"
                rel="noopener noreferrer"
              />
              {(guide?.label || editMode) && (
                <EditableLink
                  field="guide"
                  className="btn-two"
                  target="_blank"
                  rel="noopener noreferrer"
                />
              )}
              {(anafInfo?.label || editMode) && (
                <EditableLink field="anafInfo" className="btn-two" />
              )}
            </div>
            {(deadlineNote || editMode) && (
              <div className="gt-note mt-30">
                <EditableParagraphs field="deadlineNote" />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
