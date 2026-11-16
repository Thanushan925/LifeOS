import { test } from 'node:test'
import assert from 'node:assert/strict'
import { changeSleepMode, days, setSleepWindow, sleepGroups, sleepMinutes, availableTimezones, type PlanningSettings } from '../src/settings/planning.ts'

function preferences(): PlanningSettings {
  return {
    timezone: 'America/Toronto', planning_weeks: 2, sleep_mode: 'custom',
    sleep_schedule: Object.fromEntries(days.map((day) => [day, { bedtime: '23:30', wake_time: '07:30' }])) as PlanningSettings['sleep_schedule'],
    focus_periods: [], break_periods: [], daily_work_hours: 8, break_after_minutes: 50, break_minutes: 10,
  }
}

test('sleep duration handles midnight and daytime sleep', () => {
  assert.equal(sleepMinutes({ bedtime: '23:30', wake_time: '07:30' }), 480)
  assert.equal(sleepMinutes({ bedtime: '08:00', wake_time: '16:30' }), 510)
  assert.equal(sleepMinutes({ bedtime: '08:00', wake_time: '08:00' }), 0)
})

test('grouping sleep uses Monday and Saturday as representatives without mutating the draft', () => {
  const initial = preferences()
  initial.sleep_schedule.saturday = { bedtime: '01:00', wake_time: '09:00' }
  const grouped = changeSleepMode(initial, 'weekdays_weekend')
  assert.deepEqual(grouped.sleep_schedule.sunday, initial.sleep_schedule.saturday)
  assert.equal(initial.sleep_schedule.sunday.bedtime, '23:30')
  assert.deepEqual(sleepGroups('weekdays_weekend').map((group) => group.days.length), [5, 2])
  const daily = changeSleepMode(grouped, 'every_day')
  assert.ok(days.every((day) => daily.sleep_schedule[day].bedtime === '23:30'))
  assert.equal(sleepGroups('custom').length, 7)
})

test('editing shared sleep times updates only the selected days', () => {
  const initial = preferences()
  const updated = setSleepWindow(initial, ['saturday', 'sunday'], 'wake_time', '09:00')
  assert.equal(updated.sleep_schedule.saturday.wake_time, '09:00')
  assert.equal(updated.sleep_schedule.sunday.wake_time, '09:00')
  assert.equal(updated.sleep_schedule.monday.wake_time, '07:30')
  assert.equal(initial.sleep_schedule.saturday.wake_time, '07:30')
})

test('timezone dropdown retains saved aliases and UTC without duplicate options', () => {
  const zones = availableTimezones('Asia/Kolkata')
  assert.ok(zones.includes('Asia/Kolkata'))
  assert.ok(zones.includes('UTC'))
  assert.equal(zones.length, new Set(zones).size)
})
