export const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
export type Day = typeof days[number]
export type SleepMode = 'every_day' | 'weekdays_weekend' | 'custom'
export type FocusPeriod = 'morning' | 'afternoon' | 'evening' | 'night'
export type SleepWindow = { bedtime: string; wake_time: string }
export type PlanningSettings = {
  timezone: string
  planning_weeks: number
  sleep_mode: SleepMode
  sleep_schedule: Record<Day, SleepWindow>
  focus_periods: FocusPeriod[]
  break_periods: FocusPeriod[]
  daily_work_hours: number
  break_after_minutes: number
  break_minutes: number
}

export function sleepGroups(mode: SleepMode): { label: string; days: readonly Day[] }[] {
  if (mode === 'every_day') return [{ label: 'Every day', days }]
  if (mode === 'weekdays_weekend') return [
    { label: 'Weekdays (Mon–Fri)', days: days.slice(0, 5) },
    { label: 'Weekend (Sat–Sun)', days: days.slice(5) },
  ]
  return days.map((day) => ({ label: day[0].toUpperCase() + day.slice(1), days: [day] }))
}

export function changeSleepMode(settings: PlanningSettings, mode: SleepMode): PlanningSettings {
  const schedule = { ...settings.sleep_schedule }
  for (const group of sleepGroups(mode)) {
    for (const day of group.days) schedule[day] = { ...schedule[group.days[0]] }
  }
  return { ...settings, sleep_mode: mode, sleep_schedule: schedule }
}

export function setSleepWindow(settings: PlanningSettings, groupDays: readonly Day[], field: keyof SleepWindow, value: string): PlanningSettings {
  const schedule = { ...settings.sleep_schedule }
  for (const day of groupDays) schedule[day] = { ...schedule[day], [field]: value }
  return { ...settings, sleep_schedule: schedule }
}

export function sleepMinutes(window: SleepWindow): number {
  const minutes = (time: string) => {
    const [hours, mins] = time.split(':').map(Number)
    return hours * 60 + mins
  }
  return (minutes(window.wake_time) - minutes(window.bedtime) + 1440) % 1440
}

export function formatSleepDuration(window: SleepWindow): string {
  const duration = sleepMinutes(window)
  return duration > 0 ? `${Math.floor(duration / 60)}h${duration % 60 ? ` ${duration % 60}m` : ''} sleep` : 'Choose different times'
}

export function availableTimezones(current: string): string[] {
  const supported = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []
  return [...new Set(['UTC', current, 'America/Toronto', 'America/Vancouver', 'America/New_York', 'Europe/London', 'Asia/Kolkata', ...supported])].sort()
}
