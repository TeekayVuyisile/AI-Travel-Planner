import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LuSparkles } from 'react-icons/lu'
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage } from '../lib/api'
import Button from './ui/Button'

// Secondary "skip the form" option shown on the sign-in and sign-up pages
const DemoButton = ({ onError }) => {
  const { loginAsDemo } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const start = async () => {
    setLoading(true)
    try {
      await loginAsDemo()
      navigate('/dashboard')
    } catch (error) {
      onError(getErrorMessage(error, 'The demo is unavailable right now'))
      setLoading(false)
    }
  }

  return (
    <>
      <div className="my-6 flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-slate-400">
        <span className="h-px flex-1 bg-slate-200" /> or <span className="h-px flex-1 bg-slate-200" />
      </div>
      <Button type="button" variant="secondary" className="w-full" onClick={start} loading={loading}>
        <LuSparkles className="size-4 text-accent-500" aria-hidden /> Explore the demo instead
      </Button>
    </>
  )
}

export default DemoButton
