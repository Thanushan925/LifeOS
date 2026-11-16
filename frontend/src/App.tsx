import { useEffect, useState } from 'react'
import './App.css'
import { useAuth } from './context/useAuth'
import { AuthPage } from './components/AuthPage'
import { TasksPanel } from './components/TasksPanel'
import { ThemeToggle } from './components/ThemeToggle'

type ApiStatus = 'checking' | 'connected' | 'disconnected'

function App() {
  const { user, isLoading, sessionError } = useAuth()

  if (isLoading) {
    return <main className="auth-shell"><p role="status">Checking your session…</p></main>
  }
  if (sessionError && !user) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <h1>Unable to connect</h1>
          <p role="alert">{sessionError}</p>
          <button className="primary-button" onClick={() => window.location.reload()}>Try again</button>
        </section>
      </main>
    )
  }
  return user ? <Dashboard key={user.id} /> : <AuthPage />
}

function Dashboard() {
  const { user, logout, sessionError } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')

  const signOut = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    setLogoutError('')
    try {
      await logout()
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : 'Unable to sign out. Try again.')
    } finally {
      setIsLoggingOut(false)
    }
  }
  const [apiStatus, setApiStatus] = useState<ApiStatus>('checking')

  useEffect(() => {
    const checkApi = async () => {
      try {
        const response = await fetch('/api/health')

        if (!response.ok) {
          throw new Error('API health check failed')
        }

        setApiStatus('connected')
      } catch {
        setApiStatus('disconnected')
      }
    }

    void checkApi()
  }, [])

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/">
          <span className="brand-icon">L</span>
          <span>LifeOS</span>
        </a>

        <div className="account-panel">
          <strong>{user?.display_name}</strong>
          <span>{user?.email}</span>
          <button className="text-button" type="button" disabled={isLoggingOut} onClick={() => void signOut()}>
            {isLoggingOut ? 'Signing out…' : 'Sign out'}
          </button>
          {logoutError && <p className="auth-error" role="alert">{logoutError}</p>}
        </div>
        <p className="nav-label">WORKSPACE</p>

        <nav className="navigation">
          <a className="nav-item active" href="#dashboard">
            <span>◫</span> Dashboard
          </a>
          <a className="nav-item" href="#tasks">
            <span>☷</span> Tasks
          </a>
          <a className="nav-item" href="#calendar">
            <span>▦</span> Calendar
          </a>
          <a className="nav-item" href="#planning">
            <span>✧</span> AI Planning
          </a>
        </nav>

        <div className="sidebar-footer">
          <span className={`status-dot ${apiStatus}`} />
          <span>
            API{' '}
            {apiStatus === 'checking'
              ? 'Checking connection…'
              : apiStatus === 'connected'
                ? 'Connected'
                : 'Disconnected'}
          </span>
        </div>
      </aside>

      <main className="main-content" id="dashboard">
        <header className="topbar">
          <span className="eyebrow">PERSONAL OPERATING SYSTEM</span>
          <div className="topbar-actions">
          <span className="date-label">
            {new Date().toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </span>
          <ThemeToggle />
          </div>
        </header>

        {sessionError && <p className="auth-error" role="alert">{sessionError}</p>}
        <section className="welcome">
          <p className="eyebrow">YOUR SPACE. YOUR PRIORITIES.</p>
          <h1>Make room for what matters.</h1>
          <p className="welcome-copy">
            Your life, organized around your priorities — not the other way
            around.
          </p>
        </section>

        <section className="section-heading">
          <div>
            <p className="eyebrow">OVERVIEW</p>
            <h2>Your dashboard</h2>
          </div>
          <span className="live-indicator">
            <span className={`status-dot ${apiStatus}`} />
            {apiStatus === 'connected' ? 'Systems online' : 'Connecting to API'}
          </span>
        </section>

        <section className="overview-grid">
          <article className="overview-card">
            <span className="card-icon">☷</span>
            <p className="card-label">Tasks</p>
            <h3><a className="text-button" href="#tasks">Manage your tasks →</a></h3>
            <p className="card-description">
              Capture and prioritize what needs to get done.
            </p>
          </article>

          <article className="overview-card">
            <span className="card-icon">▦</span>
            <p className="card-label">Schedule</p>
            <h3>Coming soon</h3>
            <p className="card-description">
              Bring your commitments and available time together.
            </p>
          </article>

          <article className="overview-card">
            <span className="card-icon">✧</span>
            <p className="card-label">AI planner</p>
            <h3>Coming soon</h3>
            <p className="card-description">
              Build a realistic weekly plan around your priorities.
            </p>
          </article>
        </section>

        <TasksPanel />

        <section className="focus-panel" id="planning">
          <div className="focus-symbol">✧</div>
          <div>
            <p className="eyebrow">THE NEXT STEP</p>
            <h2>A plan that works for your life.</h2>
            <p>
              LifeOS will eventually balance your tasks, work schedule,
              calendar commitments, and sleep opportunity to help you plan
              your week.
            </p>
            <span className="coming-soon">PLANNING ENGINE IN DEVELOPMENT</span>
          </div>
        </section>

        <footer className="app-footer">
          LifeOS <span>·</span> Built for intentional living
        </footer>
      </main>
    </div>
  )
}

export default App
