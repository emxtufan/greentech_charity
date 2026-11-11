import { useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../common/Button'
import Input from '../common/Input'
import Modal from '../common/Modal'
import useContent from '../../hooks/useContent'
import { createSection } from '../../sections/registry'

const RESERVED_SLUGS = [
  '/login',
  '/register',
  '/dashboard',
  '/admin',
  '/website',
  '/greencube',
  '/api',
  '/uploads',
]

const slugify = (value) =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const slugFromTitle = (value) => {
  const base = slugify(value)
  return base ? `/${base}` : ''
}

export default function PagesPanel({ open, onClose }) {
  const { content, update, mutateList } = useContent()

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [showInNav, setShowInNav] = useState(true)
  const [formError, setFormError] = useState('')

  const pages = Array.isArray(content?.pages) ? content.pages : []

  const resetForm = () => {
    setTitle('')
    setSlug('')
    setSlugEdited(false)
    setShowInNav(true)
    setFormError('')
  }

  const handleTitleChange = (event) => {
    const value = event.target.value

    setTitle(value)
    if (!slugEdited) setSlug(slugFromTitle(value))
  }

  const handleSlugChange = (event) => {
    setSlug(event.target.value)
    setSlugEdited(true)
  }

  const validate = (nextTitle, nextSlug) => {
    if (!nextTitle) return 'Title is required'
    if (!nextSlug.startsWith('/')) return "Slug must start with '/'"
    if (RESERVED_SLUGS.includes(nextSlug)) return 'This slug is reserved'
    if (pages.some((page) => page?.slug === nextSlug)) return 'This slug is already used'
    return ''
  }

  const handleAdd = (event) => {
    event.preventDefault()

    const nextTitle = title.trim()
    const nextSlug = slug.trim()
    const nextError = validate(nextTitle, nextSlug)

    setFormError(nextError)
    if (nextError) return

    const page = {
      id: `page-${Date.now().toString(36)}`,
      slug: nextSlug,
      title: nextTitle,
      showInNav,
      sections: [createSection('richText')],
    }

    mutateList(['pages'], (arr) => [...arr, page])

    if (showInNav) {
      mutateList(['site', 'nav'], (arr) => [...arr, { label: nextTitle, to: nextSlug }])
    }

    resetForm()
  }

  const toggleShowInNav = (index, page) => {
    const next = !page.showInNav

    update(['pages', index, 'showInNav'], next)

    mutateList(['site', 'nav'], (arr) => {
      const list = Array.isArray(arr) ? arr : []

      if (!next) return list.filter((item) => item?.to !== page.slug)
      if (list.some((item) => item?.to === page.slug)) return list

      return [...list, { label: page.title, to: page.slug }]
    })
  }

  const handleDelete = (index, page) => {
    if (page.slug === '/') return
    if (!window.confirm(`Delete page „${page.title}”?`)) return

    mutateList(['pages'], (arr) => arr.filter((_, i) => i !== index))
    mutateList(['site', 'nav'], (arr) => arr.filter((item) => item?.to !== page.slug))
  }

  return (
    <Modal open={open} onClose={onClose} title="Pages">
      <table className="table table-sm align-middle mb-4">
        <thead>
          <tr>
            <th scope="col">Title</th>
            <th scope="col">Slug</th>
            <th scope="col">In menu</th>
            <th scope="col" />
          </tr>
        </thead>
        <tbody>
          {pages.map((page, index) => (
            <tr key={page.id ?? page.slug}>
              <td>{page.title}</td>
              <td>
                <code>{page.slug}</code>
              </td>
              <td>
                <input
                  className="form-check-input"
                  type="checkbox"
                  id={`cms-page-in-menu-${index}`}
                  checked={Boolean(page.showInNav)}
                  onChange={() => toggleShowInNav(index, page)}
                  aria-label={`Show ${page.title} in menu`}
                />
              </td>
              <td className="text-nowrap">
                <Link to={page.slug === '/' ? '/website' : page.slug} onClick={onClose}>
                  Open
                </Link>
                {page.slug !== '/' && (
                  <button
                    type="button"
                    className="cms-pages-delete"
                    onClick={() => handleDelete(index, page)}
                    title="Delete page"
                    aria-label={`Delete ${page.title}`}
                  >
                    🗑
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h6 className="mb-3">Add page</h6>

      <form onSubmit={handleAdd} noValidate>
        <Input
          label="Title"
          name="page-title"
          placeholder="About us"
          value={title}
          onChange={handleTitleChange}
        />
        <Input
          label="Slug"
          name="page-slug"
          placeholder="/about-us"
          value={slug}
          onChange={handleSlugChange}
        />

        <div className="form-check mb-3">
          <input
            className="form-check-input"
            type="checkbox"
            id="cms-page-in-menu"
            checked={showInNav}
            onChange={(event) => setShowInNav(event.target.checked)}
          />
          <label className="form-check-label" htmlFor="cms-page-in-menu">
            In menu
          </label>
        </div>

        {formError && <p className="text-danger">{formError}</p>}

        <Button type="submit" variant="one">
          Add
        </Button>
      </form>
    </Modal>
  )
}
