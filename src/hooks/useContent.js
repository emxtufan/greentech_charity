import { useContext } from 'react'
import { ContentContext } from '../context/ContentContext'

export function useContent() {
  const context = useContext(ContentContext)

  if (!context) {
    throw new Error('useContent trebuie folosit în interiorul unui ContentProvider')
  }

  return context
}

export default useContent
