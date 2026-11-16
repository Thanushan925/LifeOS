import { useState, type FormEvent } from 'react'
import { useAuth } from '../context/useAuth'

export function AuthPage() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isRegister = mode === 'register'

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) return
    setError('')
    if (isRegister && !displayName.trim()) {
      setError('Enter a display name.')
      return
    }
    if (isRegister && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setIsSubmitting(true)
    try {
      if (isRegister) {
        await register({ email: email.trim(), password, display_name: displayName.trim() })
      } else {
        await login({ email: email.trim(), password })
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to sign in. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="auth-title">
        <a className="brand" href="/">
          <span className="brand-icon">L</span><span>LifeOS</span>
        </a>
        <p className="eyebrow">YOUR SPACE. YOUR PRIORITIES.</p>
        <h1 id="auth-title">{isRegister ? 'Make room for what matters.' : 'Welcome back.'}</h1>
        <p className="auth-copy">
          {isRegister ? 'Create your account and start organizing your life.' : 'Sign in to your personal workspace.'}
        </p>
        <form onSubmit={submit} aria-busy={isSubmitting}>
          <fieldset disabled={isSubmitting}>
            {isRegister && (
              <label htmlFor="display-name">Display name
                <input id="display-name" name="display_name" autoComplete="nickname" required maxLength={80}
                  value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
              </label>
            )}
            <label htmlFor="email">Email
              <input id="email" name="email" type="email" autoComplete="username" required
                value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label htmlFor="password">Password
              <input id="password" name="password" type="password" required
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                minLength={isRegister ? 8 : undefined} maxLength={isRegister ? 128 : undefined}
                aria-describedby={isRegister ? 'password-help' : undefined}
                value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            {isRegister && <p id="password-help" className="field-help">Use 8–128 characters.</p>}
            {isRegister && (
              <label htmlFor="confirm-password">Confirm password
                <input id="confirm-password" name="confirm_password" type="password" autoComplete="new-password" required
                  value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
              </label>
            )}
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="primary-button" type="submit">
              {isSubmitting ? (isRegister ? 'Creating account…' : 'Signing in…') : (isRegister ? 'Create account' : 'Sign in')}
            </button>
          </fieldset>
        </form>
        <p className="auth-switch">
          {isRegister ? 'Already have an account?' : 'New to LifeOS?'}{' '}
          <button type="button" className="text-button" disabled={isSubmitting} onClick={() => {
            setMode(isRegister ? 'login' : 'register')
            setPassword('')
            setConfirmPassword('')
            setError('')
          }}>{isRegister ? 'Sign in' : 'Create an account'}</button>
        </p>
      </section>
    </main>
  )
}
