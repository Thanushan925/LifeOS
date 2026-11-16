import { useEffect, useState, type FormEvent } from 'react'
import { getSettings, type AccountSettings } from '../api/settings'
import { useAuth } from '../context/useAuth'
import { PlanningSettingsForm } from './PlanningSettingsForm'
import { ThemeToggle } from './ThemeToggle'
import './SettingsPage.css'

type Section = 'profile' | 'planning' | 'appearance' | 'notifications' | 'connections' | 'security'
const sections: { id: Section; label: string }[] = [
  { id: 'profile', label: 'Profile' }, { id: 'planning', label: 'Planning' },
  { id: 'appearance', label: 'Appearance' }, { id: 'notifications', label: 'Notifications' },
  { id: 'connections', label: 'Connected calendars' }, { id: 'security', label: 'Account & security' },
]

function ProfileSettings({ onDirtyChange }: { onDirtyChange: (dirty: boolean) => void }) {
  const { user, updateProfile } = useAuth()
  const [name, setName] = useState(user?.display_name ?? '')
  const [savedName, setSavedName] = useState(user?.display_name ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const dirty = name !== savedName
  useEffect(() => { onDirtyChange(dirty) }, [dirty, onDirtyChange])
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    setError(''); setNotice('')
    if (!name.trim()) { setError('Enter a display name.'); return }
    setBusy(true)
    try {
      await updateProfile(name.trim())
      setName(name.trim()); setSavedName(name.trim()); setNotice('Profile saved.')
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to save your profile.') }
    finally { setBusy(false) }
  }
  return (
    <form className="settings-form" onSubmit={save} aria-busy={busy}>
      <div className="settings-section-intro"><h2>Profile</h2><p>How you appear in your workspace.</p></div>
      <fieldset className="settings-card" disabled={busy}>
        <legend>Your details</legend>
        <label htmlFor="profile-name">Display name
          <input id="profile-name" autoComplete="nickname" maxLength={80} required value={name}
            onChange={(event) => { setName(event.target.value); setNotice('') }} />
        </label>
        <label htmlFor="profile-email">Account email
          <input id="profile-email" type="email" value={user?.email ?? ''} readOnly />
          <small>Your sign-in email. Email changes are not available yet.</small>
        </label>
      </fieldset>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <p className="settings-success" role="status">{notice}</p>
      <div className="task-actions">
        <button className="primary-button" type="submit" disabled={busy || !dirty}>{busy ? 'Saving…' : 'Save profile'}</button>
        <button className="secondary-button" type="button" disabled={busy || !dirty} onClick={() => { setName(savedName); setError(''); setNotice('') }}>Discard changes</button>
      </div>
    </form>
  )
}

function AppearanceSettings() {
  const useSystem = () => {
    try { localStorage.removeItem('lifeos-theme') } catch { /* Apply for this visit. */ }
    document.documentElement.dataset.theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    window.dispatchEvent(new Event('lifeos:theme-change'))
  }
  return (
    <div className="settings-form">
      <div className="settings-section-intro"><h2>Appearance</h2><p>Make LifeOS comfortable to use.</p></div>
      <section className="settings-card"><h3>Color theme</h3>
        <p className="settings-help">Choose light or dark mode, or follow your device. Your choice is saved in this browser and takes effect immediately.</p>
        <div className="task-actions"><ThemeToggle /><button className="secondary-button" onClick={useSystem}>Use device theme</button></div>
      </section>
    </div>
  )
}

function SecuritySettings() {
  const { logout } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const signOut = async () => {
    setBusy(true); setError('')
    try { await logout() }
    catch (error) { setError(error instanceof Error ? error.message : 'Unable to sign out.') }
    finally { setBusy(false) }
  }
  return (
    <div className="settings-form">
      <div className="settings-section-intro"><h2>Account & security</h2><p>Manage your current session.</p></div>
      <section className="settings-card"><h3>Sign-in session</h3>
        <p className="settings-help">Sign out of LifeOS in this browser. Your saved tasks and planning preferences stay with your account.</p>
        <button className="secondary-button" disabled={busy} onClick={() => void signOut()}>{busy ? 'Signing out…' : 'Sign out of this browser'}</button>
        {error && <p className="auth-error" role="alert">{error}</p>}
      </section>
    </div>
  )
}

export function SettingsPage({ onDirtyChange }: { onDirtyChange: (dirty: boolean) => void }) {
  const [section, setSection] = useState<Section>('planning')
  const [data, setData] = useState<AccountSettings | null>(null)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [planningDirty, setPlanningDirty] = useState(false)
  const [profileDirty, setProfileDirty] = useState(false)

  useEffect(() => { onDirtyChange(planningDirty || profileDirty) }, [planningDirty, profileDirty, onDirtyChange])
  useEffect(() => {
    if (!planningDirty && !profileDirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [planningDirty, profileDirty])

  useEffect(() => {
    let active = true
    const load = async () => {
      setError('')
      try {
        const result = await getSettings()
        if (!result.planning_saved) {
          const detectedZone = Intl.DateTimeFormat().resolvedOptions().timeZone
          if (detectedZone) result.planning.timezone = detectedZone
        }
        if (active) setData(result)
      } catch (error) {
        if (active) setError(error instanceof Error ? error.message : 'Unable to load settings.')
      }
    }
    void load()
    return () => { active = false }
  }, [reload])

  return (
    <div className="settings-page">
      <header className="settings-heading"><p className="eyebrow">MAKE IT YOURS</p><h1>Settings</h1><p>Your account, your routines, your pace.</p></header>
      <div className="settings-layout">
        <nav className="settings-navigation" aria-label="Settings sections">
          {sections.map((item) => <button key={item.id} className={`settings-nav-item ${section === item.id ? 'active' : ''}`}
            aria-current={section === item.id ? 'page' : undefined} onClick={() => setSection(item.id)}>{item.label}</button>)}
        </nav>
        <div className="settings-content">
          {error ? <div><p className="auth-error" role="alert">{error}</p><button className="secondary-button" onClick={() => setReload((value) => value + 1)}>Try again</button></div>
            : !data ? <p role="status">Loading settings…</p> : <>
              <section hidden={section !== 'profile'} aria-label="Profile settings"><ProfileSettings onDirtyChange={setProfileDirty} /></section>
              <section hidden={section !== 'planning'} aria-label="Planning settings"><PlanningSettingsForm initial={data.planning} onDirtyChange={setPlanningDirty} /></section>
              <section hidden={section !== 'appearance'} aria-label="Appearance settings"><AppearanceSettings /></section>
              <section hidden={section !== 'notifications'} aria-label="Notification settings">
                <div className="settings-section-intro"><h2>Notifications</h2><p>Reminders and check-ins will live here.</p></div>
                <div className="settings-card"><h3>Not available yet</h3><p className="settings-help">Notification delivery will be added with daily check-ins. LifeOS does not send reminders yet.</p></div>
              </section>
              <section hidden={section !== 'connections'} aria-label="Connected calendar settings">
                <div className="settings-section-intro"><h2>Connected calendars</h2><p>Bring your existing commitments into LifeOS.</p></div>
                <div className="settings-card"><h3>iCloud Calendar · Coming soon</h3><p className="settings-help">Calendar connections will be added next. No external calendars are connected through LifeOS yet.</p></div>
              </section>
              <section hidden={section !== 'security'} aria-label="Account and security settings"><SecuritySettings /></section>
            </>}
        </div>
      </div>
    </div>
  )
}
