import { request } from './client'

export type TaskStatus = 'pending' | 'in_progress' | 'completed'
export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskData = {
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  estimated_minutes: number
  due_date: string | null
}
export type Task = TaskData & {
  id: string
  created_at: string
  updated_at: string
}

export const getTasks = () => request<Task[]>('/tasks')
export const createTask = (data: TaskData) => request<Task>('/tasks', {
  method: 'POST', body: JSON.stringify(data),
})
export const updateTask = (id: string, data: Partial<TaskData>) => request<Task>(`/tasks/${id}`, {
  method: 'PATCH', body: JSON.stringify(data),
})
export const deleteTask = (id: string) => request<void>(`/tasks/${id}`, { method: 'DELETE' })
