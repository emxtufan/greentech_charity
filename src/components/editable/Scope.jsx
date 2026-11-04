import { createContext, useCallback, useContext, useMemo } from 'react'
import useContent from '../../hooks/useContent'
import { getIn, toPath } from '../../utils/path'

export const ScopeContext = createContext([])

// path = absolut (array sau "a.b.0"), field = relativ la scope-ul curent
export function Scope({ path, field, children }) {
  const parentPath = useContext(ScopeContext)

  const basePath = useMemo(() => {
    if (path !== undefined && path !== null && path !== '') return toPath(path)
    if (field !== undefined && field !== null && field !== '') return [...parentPath, ...toPath(field)]
    return parentPath
  }, [path, field, parentPath])

  return <ScopeContext.Provider value={basePath}>{children}</ScopeContext.Provider>
}

export function useScopePath(field) {
  const parentPath = useContext(ScopeContext)

  return useMemo(() => {
    if (field === undefined || field === null || field === '') return parentPath
    return [...parentPath, ...toPath(field)]
  }, [parentPath, field])
}

export function useData() {
  const { content } = useContent()
  const scopePath = useContext(ScopeContext)

  return getIn(content, scopePath)
}

export function useField(field) {
  const { content, update } = useContent()
  const path = useScopePath(field)
  const value = getIn(content, path)

  const set = useCallback(
    (next) => {
      update(path, next)
    },
    [update, path]
  )

  return { value, path, set }
}
