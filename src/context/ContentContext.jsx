import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import adminService from '../services/adminService'
import contentService from '../services/contentService'
import { normalizeContent } from '../sections/registry'
import { getIn, setIn } from '../utils/path'

export const ContentContext = createContext(null)

const EDIT_MODE_KEY = 'wc_edit'
const HISTORY_LIMIT = 50

const readEditFlag = () => {
  try {
    return sessionStorage.getItem(EDIT_MODE_KEY) === '1'
  } catch {
    return false
  }
}

const writeEditFlag = (value) => {
  try {
    if (value) sessionStorage.setItem(EDIT_MODE_KEY, '1')
    else sessionStorage.removeItem(EDIT_MODE_KEY)
  } catch {
    // sessionStorage indisponibil
  }
}

export function ContentProvider({ children }) {
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [history, setHistory] = useState([])
  const [dirty, setDirty] = useState(false)

  const contentRef = useRef(null)
  const historyRef = useRef([])

  const applyContent = useCallback((next) => {
    contentRef.current = next
    setContent(next)
  }, [])

  const pushHistory = useCallback((snapshot) => {
    const next = [...historyRef.current, snapshot].slice(-HISTORY_LIMIT)
    historyRef.current = next
    setHistory(next)
  }, [])

  const clearHistory = useCallback(() => {
    historyRef.current = []
    setHistory([])
  }, [])

  useEffect(() => {
    let active = true

    setLoading(true)

    contentService
      .getContent()
      .then((data) => {
        if (!active) return
        const normalized = normalizeContent(data)
        contentRef.current = normalized
        setContent(normalized)
        setError(null)
      })
      .catch((err) => {
        if (active) setError(err.message || 'Eroare la încărcarea conținutului')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true

    if (!adminService.getToken()) {
      setIsAdmin(false)
      setEditMode(false)
      return () => {
        active = false
      }
    }

    adminService
      .me()
      .then((ok) => {
        if (!active) return
        setIsAdmin(ok)
        if (ok) {
          setEditMode(readEditFlag())
        } else {
          writeEditFlag(false)
          setEditMode(false)
        }
      })
      .catch(() => {
        if (!active) return
        setIsAdmin(false)
        setEditMode(false)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!dirty) return undefined

    const handler = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handler)

    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const setEditModeSafe = useCallback((next) => {
    const value = Boolean(next) && isAdmin
    writeEditFlag(value)
    setEditMode(value)
    return value
  }, [isAdmin])

  const update = useCallback((path, value) => {
    const current = contentRef.current
    if (!current) return

    pushHistory(current)
    applyContent(setIn(current, path, value))
    setDirty(true)
  }, [applyContent, pushHistory])

  const mutateList = useCallback((path, fn) => {
    const current = contentRef.current
    if (!current) return

    const list = getIn(current, path)
    const nextList = fn(Array.isArray(list) ? list : [])

    if (!Array.isArray(nextList)) return

    pushHistory(current)
    applyContent(setIn(current, path, nextList))
    setDirty(true)
  }, [applyContent, pushHistory])

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return

    const previous = historyRef.current[historyRef.current.length - 1]
    const next = historyRef.current.slice(0, -1)

    historyRef.current = next
    setHistory(next)
    applyContent(previous)
    setDirty(true)
  }, [applyContent])

  const discard = useCallback(async () => {
    const data = await contentService.getContent()
    const normalized = normalizeContent(data)
    applyContent(normalized)
    clearHistory()
    setError(null)
    setDirty(false)
    return normalized
  }, [applyContent, clearHistory])

  const save = useCallback(async () => {
    const current = contentRef.current
    if (!current) throw new Error('Conținutul nu este încărcat')

    await contentService.saveContent(current)
    setDirty(false)

    return current
  }, [])

  const adminLogin = useCallback(async (password) => {
    await adminService.login(password)
    setIsAdmin(true)
    return true
  }, [])

  const adminLogout = useCallback(() => {
    adminService.logout()
    writeEditFlag(false)
    setIsAdmin(false)
    setEditMode(false)
  }, [])

  const value = useMemo(
    () => ({
      content,
      loading,
      error,
      isAdmin,
      editMode,
      setEditMode: setEditModeSafe,
      history,
      canUndo: history.length > 0,
      dirty,
      update,
      mutateList,
      undo,
      discard,
      save,
      adminLogin,
      adminLogout,
    }),
    [
      content,
      loading,
      error,
      isAdmin,
      editMode,
      setEditModeSafe,
      history,
      dirty,
      update,
      mutateList,
      undo,
      discard,
      save,
      adminLogin,
      adminLogout,
    ]
  )

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>
}
