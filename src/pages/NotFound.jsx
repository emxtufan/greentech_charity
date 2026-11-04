import Button from '../components/common/Button'

export default function NotFound() {
  return (
    <div className="header-space-fix d-flex flex-column align-items-center justify-content-center text-center py-5 my-5">
      <h1 className="mb-20">Pagina nu există</h1>
      <p className="mb-30">Se poate ca pagina să fi fost mutată sau ca adresa să fie greșită.</p>
      <Button to="/" variant="one">
        Înapoi la prima pagină
      </Button>
    </div>
  )
}
