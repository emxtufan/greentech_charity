import Button from '../components/common/Button'

export default function NotFound() {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center text-center py-5 my-5">
      <h1 className="mb-20">404</h1>
      <p className="mb-30">Page not found</p>
      <Button to="/" variant="one">
        Back to home
      </Button>
    </div>
  )
}
