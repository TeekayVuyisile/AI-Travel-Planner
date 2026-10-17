import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage } from '../lib/api'
import { usePageTitle } from '../lib/usePageTitle'
import AuthLayout from '../components/layout/AuthLayout'
import DemoButton from '../components/DemoButton'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import Field from '../components/ui/Field'

const Login = () => {
  usePageTitle('Sign in')
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const update = (event) => {
    const { name, value } = event.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(form.email, form.password)
      navigate(location.state?.from || '/dashboard', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, 'Sign in failed'))
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to see your trips."
      footer={<>New here? <Link to="/register" className="font-semibold text-brand-700 hover:text-brand-800">Create an account</Link></>}
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        {error && <Alert>{error}</Alert>}
        <Field label="Email" name="email" type="email" autoComplete="email" required value={form.email} onChange={update} />
        <Field label="Password" name="password" type="password" autoComplete="current-password" required value={form.password} onChange={update} />
        <Button type="submit" className="w-full" loading={submitting}>Sign in</Button>
      </form>
      <DemoButton onError={setError} />
    </AuthLayout>
  )
}

export default Login
