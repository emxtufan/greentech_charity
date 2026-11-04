import { useState } from 'react'
import useContent from '../../hooks/useContent'
import { createSection, sectionTypes } from '../../sections/registry'
import { insertAt, moveItem, removeAt } from '../../utils/path'
import { cx } from '../../utils/helpers'
import AddSectionModal from './AddSectionModal'

const createId = (type) =>
  `${type}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

export default function SectionToolbar({ pageIndex, index, section, count, children }) {
  const { update, mutateList } = useContent()
  const [addOpen, setAddOpen] = useState(false)

  const sectionsPath = ['pages', pageIndex, 'sections']
  const label = sectionTypes[section.type]?.label ?? section.type
  const isFirst = index === 0
  const isLast = index >= count - 1

  const move = (to) => {
    mutateList(sectionsPath, (list) => moveItem(list, index, to))
  }

  const toggleHidden = () => {
    update([...sectionsPath, index, 'hidden'], !section.hidden)
  }

  const duplicate = () => {
    mutateList(sectionsPath, (list) =>
      insertAt(list, index + 1, { ...structuredClone(section), id: createId(section.type) })
    )
  }

  const remove = () => {
    if (!window.confirm(`Ștergi secțiunea „${label}”?`)) return
    mutateList(sectionsPath, (list) => removeAt(list, index))
  }

  const addAfter = (type) => {
    mutateList(sectionsPath, (list) => insertAt(list, index + 1, createSection(type)))
    setAddOpen(false)
  }

  return (
    <div className={cx('cms-section', section.hidden && 'is-hidden')}>
      <div className="cms-ui cms-section-bar">
        <span className="cms-section-label">
          {label}
          {section.hidden && <span className="cms-section-hidden">Hidden</span>}
        </span>
        <button
          type="button"
          onClick={() => move(index - 1)}
          disabled={isFirst}
          title="Move up"
          aria-label="Move up"
        >
          ↑
        </button>
        <button
          type="button"
          onClick={() => move(index + 1)}
          disabled={isLast}
          title="Move down"
          aria-label="Move down"
        >
          ↓
        </button>
        <button
          type="button"
          onClick={toggleHidden}
          title={section.hidden ? 'Show section' : 'Hide section'}
          aria-label={section.hidden ? 'Show section' : 'Hide section'}
        >
          {section.hidden ? '🙈' : '👁'}
        </button>
        <button type="button" onClick={duplicate} title="Duplicate" aria-label="Duplicate">
          ⧉
        </button>
        <button type="button" onClick={remove} title="Delete" aria-label="Delete">
          🗑
        </button>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          title="Add section below"
          aria-label="Add section below"
        >
          + Section
        </button>
      </div>

      {children}

      <AddSectionModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSelect={addAfter}
      />
    </div>
  )
}
