import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const syncPreference = () => {
      let saved: string | null = null
      try { saved = localStorage.getItem('lifeos-theme') } catch { /* Use system preference. */ }
      const next = saved === 'light' || saved === 'dark' ? saved : media.matches ? 'dark' : 'light'
      document.documentElement.dataset.theme = next
      setTheme(next)
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'lifeos-theme' || event.key === null) syncPreference()
    }
    media.addEventListener('change', syncPreference)
    window.addEventListener('storage', onStorage)
    return () => {
      media.removeEventListener('change', syncPreference)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    setTheme(next)
    try { localStorage.setItem('lifeos-theme', next) } catch { /* Still works for this visit. */ }
  }

  return (
    <button className="theme-toggle" type="button" onClick={toggle}
      aria-label="Dark mode" aria-pressed={theme === 'dark'}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
      <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
      {theme === 'dark' ? 'Light mode' : 'Dark mode'}
    </button>
  )
}
