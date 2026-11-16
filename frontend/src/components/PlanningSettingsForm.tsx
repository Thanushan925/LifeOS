import { useEffect, useState, type FormEvent } from 'react'
import { savePlanningSettings } from '../api/settings'
import {
  availableTimezones, changeSleepMode, days, formatSleepDuration, setSleepWindow, sleepGroups, sleepMinutes,
  type FocusPeriod, type PlanningSettings, type SleepMode,
} from '../settings/planning'

const focusChoices: { value: FocusPeriod; label: string; range: string }[] = [
  { value: 'morning', label: 'Morning', range: '6 am – noon' },
  { value: 'afternoon', label: 'Afternoon', range: 'Noon – 5 pm' },
  { value: 'evening', label: 'Evening', range: '5 – 9 pm' },
  { value: 'night', label: 'Night', range: '9 pm – 6 am' },
]

export function PlanningSettingsForm({ initial, onDirtyChange }: {
  initial: PlanningSettings
  onDirtyChange: (dirty: boolean) => void
}) {
  const [settings, setSettings] = useState(initial)
  const [saved, setSaved] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const dirty = JSON.stringify(settings) !== JSON.stringify(saved)
  const timezones = availableTimezones(settings.timezone)
  const shortNights = days.filter((day) => sleepMinutes(settings.sleep_schedule[day]) < 480).length

  useEffect(() => { onDirtyChange(dirty) }, [dirty, onDirtyChange])

  const change = <K extends keyof PlanningSettings>(field: K, value: PlanningSettings[K]) => {
    setSettings((current) => ({ ...current, [field]: value }))
    setNotice('')
  }
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    setError(''); setNotice('')
    if (days.some((day) => !settings.sleep_schedule[day].bedtime || !settings.sleep_schedule[day].wake_time || !sleepMinutes(settings.sleep_schedule[day]))) {
      setError('Choose different bedtime and wake-up times for each sleep window.')
      return
    }
    setBusy(true)
    try {
      const result = await savePlanningSettings(settings)
      setSettings(result); setSaved(result); setNotice('Planning preferences saved.')
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to save preferences.') }
    finally { setBusy(false) }
  }

  return (
    <form className="settings-form" onSubmit={save} aria-busy={busy}>
      <div className="settings-section-intro">
        <h2>Planning</h2>
        <p>Set the boundaries for a week that works for you. These preferences will guide scheduling when the planner is available.</p>
      </div>
      <fieldset disabled={busy} className="settings-card">
        <legend>Plan ahead</legend>
        <div className="settings-field-grid">
          <label htmlFor="planning-weeks">Planning window
            <div className="input-with-unit"><input id="planning-weeks" type="number" required min={1} max={12} step={1}
              value={settings.planning_weeks || ''} onChange={(event) => change('planning_weeks', Number(event.target.value))} /><span>weeks</span></div>
            <small>Choose 1–12 weeks ahead. This saves your preference; it does not generate a plan yet.</small>
          </label>
          <label htmlFor="planning-timezone">Timezone
            <select id="planning-timezone" value={settings.timezone} onChange={(event) => change('timezone', event.target.value)}>
              {timezones.map((zone) => <option key={zone} value={zone}>{zone.replaceAll('_', ' ')}</option>)}
            </select>
            <small>Sleep and focus times use this timezone, including daylight saving changes.</small>
          </label>
        </div>
      </fieldset>

      <fieldset disabled={busy} className="settings-card">
        <legend>Sleep schedule</legend>
        <label htmlFor="sleep-mode">Schedule pattern
          <select id="sleep-mode" value={settings.sleep_mode} onChange={(event) => {
            setSettings((current) => changeSleepMode(current, event.target.value as SleepMode)); setNotice('')
          }}>
            <option value="every_day">Same times every day</option>
            <option value="weekdays_weekend">Different times for weekdays and weekends</option>
            <option value="custom">Different times each day</option>
          </select>
        </label>
        <p className="settings-help" id="sleep-explanation">Each day names the night you go to bed. Wake-up is the following morning (or next occurrence of that time). Weekdays are Monday–Friday nights; weekends are Saturday–Sunday nights.</p>
        <p className="settings-help">When switching to a shared pattern, Monday’s times apply to weekdays and Saturday’s to weekends. Switching to every day uses Monday’s times.</p>
        <div className="sleep-schedule" aria-describedby="sleep-explanation">
          {sleepGroups(settings.sleep_mode).map((group) => {
            const window = settings.sleep_schedule[group.days[0]]
            const prefix = `sleep-${group.days[0]}`
            return (
              <div className="sleep-row" key={group.label}>
                <div className="sleep-day"><strong>{group.label}</strong><span>{formatSleepDuration(window)}</span></div>
                <label htmlFor={`${prefix}-bedtime`}>Bedtime
                  <input id={`${prefix}-bedtime`} type="time" step={60} required value={window.bedtime}
                    onChange={(event) => { setSettings((current) => setSleepWindow(current, group.days, 'bedtime', event.target.value)); setNotice('') }} />
                </label>
                <label htmlFor={`${prefix}-wake`}>Wake up
                  <input id={`${prefix}-wake`} type="time" step={60} required value={window.wake_time}
                    onChange={(event) => { setSettings((current) => setSleepWindow(current, group.days, 'wake_time', event.target.value)); setNotice('') }} />
                </label>
              </div>
            )
          })}
        </div>
        {shortNights > 0 && <p className="settings-advice">{shortNights} {shortNights === 1 ? 'night has' : 'nights have'} less than 8 hours set aside for sleep.</p>}
      </fieldset>

      <fieldset disabled={busy} className="settings-card">
        <legend>Focus and workload</legend>
        <p className="settings-help" id="focus-help">When do you prefer focused work? Pick more than one, or leave all unchecked for no preference. Sleep always takes priority.</p>
        <div className="focus-options" role="group" aria-label="Preferred focus periods" aria-describedby="focus-help">
          {focusChoices.map((choice) => (
            <label className="focus-choice" key={choice.value}>
              <input type="checkbox" checked={settings.focus_periods.includes(choice.value)} onChange={(event) => {
                change('focus_periods', event.target.checked ? [...settings.focus_periods, choice.value] : settings.focus_periods.filter((period) => period !== choice.value))
              }} />
              <span><strong>{choice.label}</strong><small>{choice.range}</small></span>
            </label>
          ))}
        </div>
        <label className="settings-narrow" htmlFor="daily-work-hours">Daily work limit
          <div className="input-with-unit"><input id="daily-work-hours" type="number" min={0} max={24} step={1} required
            value={settings.daily_work_hours} onChange={(event) => change('daily_work_hours', Number(event.target.value))} /><span>hours / day</span></div>
          <small>A whole number from 0–24. This caps scheduled task time, excluding breaks; available time may be lower after sleep and commitments.</small>
        </label>
      </fieldset>

      <fieldset disabled={busy} className="settings-card">
        <legend>Break rhythm</legend>
        <p className="settings-help" id="break-help">When do you prefer downtime? Pick multiple periods, or leave all unchecked for no preference. Short breaks still follow your work interval throughout the day.</p>
        <div className="focus-options" role="group" aria-label="Preferred break periods" aria-describedby="break-help">
          {focusChoices.map((choice) => (
            <label className="focus-choice" key={choice.value}>
              <input type="checkbox" checked={settings.break_periods.includes(choice.value)} onChange={(event) => {
                change('break_periods', event.target.checked ? [...settings.break_periods, choice.value] : settings.break_periods.filter((period) => period !== choice.value))
              }} />
              <span><strong>{choice.label}</strong><small>{choice.range}</small></span>
            </label>
          ))}
        </div>
        <div className="settings-field-grid">
          <label htmlFor="break-after">Take a break after
            <div className="input-with-unit"><input id="break-after" type="number" required min={15} max={240} step={1}
              value={settings.break_after_minutes || ''} onChange={(event) => change('break_after_minutes', Number(event.target.value))} /><span>minutes of work</span></div>
          </label>
          <label htmlFor="break-length">Break length
            <div className="input-with-unit"><input id="break-length" type="number" required min={5} max={120} step={1}
              value={settings.break_minutes || ''} onChange={(event) => change('break_minutes', Number(event.target.value))} /><span>minutes</span></div>
          </label>
        </div>
      </fieldset>
      <div className="settings-save-bar">
        <div aria-live="polite">{error ? <p className="auth-error" role="alert">{error}</p> : notice ? <p className="settings-success">{notice}</p> : <p className="settings-help">{dirty ? 'You have unsaved changes.' : 'Your preferences are up to date.'}</p>}</div>
        <div className="task-actions">
          <button className="secondary-button" type="button" disabled={busy || !dirty} onClick={() => { setSettings(saved); setError(''); setNotice('') }}>Discard changes</button>
          <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save planning preferences'}</button>
        </div>
      </div>
    </form>
  )
}
