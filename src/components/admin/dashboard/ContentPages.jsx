import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useContent from '../../../hooks/useContent'
import PagesPanel from '../PagesPanel'

// pagina „/” este servită de ruta /website
const pagePath = (slug) => (slug === '/' ? '/website' : slug)

export default function ContentPages() {
  const { content, setEditMode } = useContent()
  const navigate = useNavigate()

  const [pagesOpen, setPagesOpen] = useState(false)

  const pages = Array.isArray(content?.pages) ? content.pages : []

  const handleEdit = (slug) => {
    setEditMode(true)
    navigate(pagePath(slug))
  }

  return (
    <div className="gt-admin-card">
      <h6 className="mb-3">Pagini și documente</h6>

      {pages.length === 0 && <p className="mb-0">Nu există pagini definite încă.</p>}

      {pages.length > 0 && (
        <ul className="list-unstyled mb-0">
          {pages.map((page, index) => (
            <li
              key={page.id ?? page.slug ?? index}
              className="d-flex flex-wrap align-items-center gap-2 py-2 border-bottom"
            >
              <div className="me-auto">
                <strong>{page.title}</strong>
                <div>
                  <code>{page.slug}</code>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => handleEdit(page.slug)}
              >
                Editează conținutul
              </button>

              <Link to={pagePath(page.slug)} className="btn btn-link btn-sm">
                Deschide pagina
              </Link>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        className="gt-admin-primary mt-3"
        onClick={() => setPagesOpen(true)}
      >
        Administrează paginile
      </button>

      <PagesPanel open={pagesOpen} onClose={() => setPagesOpen(false)} />
    </div>
  )
}
