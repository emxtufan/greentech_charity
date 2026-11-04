import { Fragment, useState } from 'react'
import useContent from '../../hooks/useContent'
import { Scope } from '../editable'
import { createSection, sectionTypes } from '../../sections/registry'
import { insertAt } from '../../utils/path'
import SectionToolbar from './SectionToolbar'
import AddSectionModal from './AddSectionModal'

export default function PageRenderer({ pageIndex }) {
  const { content, editMode, mutateList } = useContent()
  const [addOpen, setAddOpen] = useState(false)

  const page = content?.pages?.[pageIndex]
  const sections = Array.isArray(page?.sections) ? page.sections : []
  const sectionsPath = ['pages', pageIndex, 'sections']

  const addFirst = (type) => {
    mutateList(sectionsPath, (list) => insertAt(list, 0, createSection(type)))
    setAddOpen(false)
  }

  return (
    <>
      {editMode && sections.length === 0 && (
        <div className="cms-empty-page">
          <button type="button" className="cms-add-btn" onClick={() => setAddOpen(true)}>
            + Add section
          </button>
        </div>
      )}

      {sections.map((section, si) => {
        const entry = sectionTypes[section.type]
        if (!entry) return null
        if (section.hidden && !editMode) return null

        const Component = entry.component
        const key = section.id ?? `${section.type}-${si}`
        const inner = (
          <Scope path={[...sectionsPath, si, 'data']}>
            <Component />
          </Scope>
        )

        if (!editMode) return <Fragment key={key}>{inner}</Fragment>

        return (
          <SectionToolbar
            key={key}
            pageIndex={pageIndex}
            index={si}
            section={section}
            count={sections.length}
          >
            {inner}
          </SectionToolbar>
        )
      })}

      <AddSectionModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSelect={addFirst}
      />
    </>
  )
}
