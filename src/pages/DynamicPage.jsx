import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import useContent from '../hooks/useContent'
import PageRenderer from '../components/admin/PageRenderer'
import NotFound from './NotFound'

const normalizeSlug = (value) => {
  if (value === undefined || value === null || value === '') return '/'

  const clean = String(value).split('?')[0].split('#')[0]
  const trimmed = clean.replace(/\/+$/, '')

  return trimmed === '' ? '/' : trimmed
}

export default function DynamicPage() {
  const { content, loading, error } = useContent()
  const location = useLocation()

  const pages = Array.isArray(content?.pages) ? content.pages : []
  const slug = normalizeSlug(location.pathname)
  const pageIndex = pages.findIndex((page) => normalizeSlug(page?.slug) === slug)
  const page = pageIndex >= 0 ? pages[pageIndex] : null
  const siteName = content?.site?.name ?? ''

  useEffect(() => {
    if (!page) return

    document.title =
      page.slug === '/' ? content?.site?.title || siteName : `${page.title} | ${siteName}`

    const description = page.description || content?.site?.description || ''
    let meta = document.querySelector('meta[name="description"]')

    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'description')
      document.head.appendChild(meta)
    }

    meta.setAttribute('content', description)
  }, [page, content, siteName])

  if (loading && !content) return null

  if (error) {
    return (
      <div className="container pt-150 pb-150">
        <p className="mb-0">
          Nu pot încărca conținutul. Pornește serverul: npm run dev
        </p>
      </div>
    )
  }

  if (pageIndex < 0) return <NotFound />

  return <PageRenderer pageIndex={pageIndex} />
}
