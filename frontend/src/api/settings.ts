import { request } from './client'
import type { User } from './auth'
import type { PlanningSettings } from '../settings/planning'

export type AccountSettings = { profile: User; planning: PlanningSettings; planning_saved: boolean }
export const getSettings = () => request<AccountSettings>('/settings')
export const savePlanningSettings = (data: PlanningSettings) => request<PlanningSettings>('/settings/planning', {
  method: 'PUT', body: JSON.stringify(data),
})
