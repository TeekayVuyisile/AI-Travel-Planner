import { Link } from 'react-router-dom'
import { LuCompass } from 'react-icons/lu'
import Button from '../components/ui/Button'
import { usePageTitle } from '../lib/usePageTitle'

const NotFound = () => {
  usePageTitle('Page not found')
  return (
  <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
    <LuCompass className="size-10 text-brand-700" aria-hidden />
    <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">This page went off the map</h1>
    <p className="mt-2 text-slate-600">The link may be broken, or the page has moved.</p>
    <Button as={Link} to="/" className="mt-8">Back to home</Button>
  </div>
  )
}

export default NotFound
