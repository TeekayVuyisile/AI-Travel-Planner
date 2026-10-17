import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage } from '../lib/api'
import { usePageTitle } from '../lib/usePageTitle'
import AuthLayout from '../components/layout/AuthLayout'
import DemoButton from '../components/DemoButton'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import Field from '../components/ui/Field'

const validate = (form) => {
  const errors = {}
  if (!form.first_name.trim()) errors.first_name = 'Enter your first name'
  if (!form.last_name.trim()) errors.last_name = 'Enter your last name'
  if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = 'Enter a valid email address'
  if (form.password.length < 6) errors.password = 'Use at least 6 characters'
  if (form.confirm !== form.password) errors.confirm = 'Passwords do not match'
  return errors
}

const Register = () => {
  usePageTitle('Create an account')
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '', confirm: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const update = (event) => {
    const { name, value } = event.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    const errors = validate(form)
    setFieldErrors(errors)
    if (Object.keys(errors).length) return

    setSubmitting(true)
    try {
      const { confirm: _confirm, ...userData } = form
      await register(userData)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create your account'))
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start planning trips with your friends."
      footer={<>Already have an account? <Link to="/login" className="font-semibold text-brand-700 hover:text-brand-800">Sign in</Link></>}
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        {error && <Alert>{error}</Alert>}
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="First name" name="first_name" autoComplete="given-name" value={form.first_name} onChange={update} error={fieldErrors.first_name} />
          <Field label="Last name" name="last_name" autoComplete="family-name" value={form.last_name} onChange={update} error={fieldErrors.last_name} />
        </div>
        <Field label="Email" name="email" type="email" autoComplete="email" value={form.email} onChange={update} error={fieldErrors.email} />
        <Field label="Password" name="password" type="password" autoComplete="new-password" value={form.password} onChange={update} error={fieldErrors.password} hint="At least 6 characters" />
        <Field label="Confirm password" name="confirm" type="password" autoComplete="new-password" value={form.confirm} onChange={update} error={fieldErrors.confirm} />
        <Button type="submit" className="w-full" loading={submitting}>Create account</Button>
      </form>
      <DemoButton onError={setError} />
    </AuthLayout>
  )
}

export default Register
