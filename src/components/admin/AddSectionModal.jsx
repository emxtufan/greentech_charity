import Modal from '../common/Modal'
import { sectionTypes } from '../../sections/registry'

export default function AddSectionModal({ open, onClose, onSelect }) {
  const handleSelect = (type) => {
    onSelect?.(type)
  }

  return (
    <Modal open={open} onClose={onClose} title="Add section">
      <div className="cms-section-picker">
        {Object.entries(sectionTypes)
          .filter(([, entry]) => !entry.legacy)
          .map(([type, entry]) => (
            <button
              key={type}
              type="button"
              className="cms-section-picker-btn"
              onClick={() => handleSelect(type)}
            >
              {entry.label}
            </button>
          ))}
      </div>
    </Modal>
  )
}
