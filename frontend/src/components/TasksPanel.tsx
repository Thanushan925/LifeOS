import { useEffect, useState, type FormEvent } from 'react'
import {
  createTask, deleteTask, getTasks, updateTask,
  type Task, type TaskData, type TaskPriority, type TaskStatus,
} from '../api/tasks'
import './TasksPanel.css'

const statusLabels: Record<TaskStatus, string> = {
  pending: 'To do', in_progress: 'In progress', completed: 'Completed',
}
const priorityLabels: Record<TaskPriority, string> = { low: 'Low', medium: 'Medium', high: 'High' }
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Unable to save changes. Try again.'

function TaskForm({ task, busy, onSave, onCancel }: {
  task: Task | null
  busy: boolean
  onSave: (data: TaskData) => Promise<void>
  onCancel: () => void
}) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'pending')
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'medium')
  const [minutes, setMinutes] = useState(String(task?.estimated_minutes ?? 30))
  const [dueDate, setDueDate] = useState(task?.due_date ?? '')
  const [error, setError] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    setError('')
    if (!title.trim()) { setError('Enter a task title.'); return }
    try {
      await onSave({
        title: title.trim(), description: description.trim() || null,
        status, priority, estimated_minutes: Number(minutes), due_date: dueDate || null,
      })
      if (!task) {
        setTitle(''); setDescription(''); setStatus('pending')
        setPriority('medium'); setMinutes('30'); setDueDate('')
      }
    } catch (error) { setError(errorMessage(error)) }
  }

  return (
    <form className="task-form" onSubmit={submit} aria-labelledby="task-form-title" aria-busy={busy}>
      <h3 id="task-form-title">{task ? 'Edit task' : 'Add a task'}</h3>
      <fieldset disabled={busy}>
        <label htmlFor="task-title">Title
          <input id="task-title" value={title} maxLength={200} required
            placeholder="What needs to get done?" onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label htmlFor="task-description">Notes <span className="optional-label">(optional)</span>
          <textarea id="task-description" value={description} maxLength={5000} rows={3}
            onChange={(event) => setDescription(event.target.value)} />
        </label>
        <div className="task-form-grid">
          <label htmlFor="task-status">Status
            <select id="task-status" value={status} onChange={(event) => setStatus(event.target.value as TaskStatus)}>
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label htmlFor="task-priority">Priority
            <select id="task-priority" value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)}>
              {Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label htmlFor="task-minutes">Estimate (minutes)
            <input id="task-minutes" type="number" required min={1} max={10080} step={1} value={minutes}
              onChange={(event) => setMinutes(event.target.value)} />
          </label>
          <label htmlFor="task-date">Due date <span className="optional-label">(optional)</span>
            <input id="task-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </label>
        </div>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <div className="task-actions">
          <button className="primary-button" type="submit">{busy ? 'Saving…' : task ? 'Save changes' : 'Add task'}</button>
          {task && <button className="secondary-button" type="button" onClick={onCancel}>Cancel edit</button>}
        </div>
      </fieldset>
    </form>
  )
}

export function TasksPanel() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [notice, setNotice] = useState('')
  const [reload, setReload] = useState(0)
  const [busy, setBusy] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all')

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      setLoadError('')
      try {
        const result = await getTasks()
        if (active) setTasks(result)
      } catch (error) {
        if (active) setLoadError(errorMessage(error))
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [reload])

  const save = async (data: TaskData) => {
    setBusy(true)
    setActionError('')
    setNotice('')
    try {
      if (editingTask) {
        const saved = await updateTask(editingTask.id, data)
        setTasks((current) => current.map((task) => task.id === saved.id ? saved : task))
        setEditingTask(null)
        setNotice('Task updated.')
      } else {
        const saved = await createTask(data)
        setTasks((current) => [saved, ...current])
        setNotice('Task added.')
      }
    } finally { setBusy(false) }
  }

  const toggleCompleted = async (task: Task) => {
    if (busy) return
    setBusy(true); setActionError(''); setNotice('')
    try {
      const saved = await updateTask(task.id, { status: task.status === 'completed' ? 'pending' : 'completed' })
      setTasks((current) => current.map((item) => item.id === saved.id ? saved : item))
      setNotice(saved.status === 'completed' ? 'Task completed.' : 'Task reopened.')
    } catch (error) { setActionError(errorMessage(error)) }
    finally { setBusy(false) }
  }

  const remove = async (task: Task) => {
    if (busy) return
    setBusy(true); setActionError(''); setNotice('')
    try {
      await deleteTask(task.id)
      setTasks((current) => current.filter((item) => item.id !== task.id))
      setDeletingId(null)
      setNotice('Task deleted.')
    } catch (error) { setActionError(errorMessage(error)) }
    finally { setBusy(false) }
  }

  const visibleTasks = tasks.filter((task) =>
    (statusFilter === 'all' || task.status === statusFilter) &&
    (priorityFilter === 'all' || task.priority === priorityFilter))
  const remaining = tasks.filter((task) => task.status !== 'completed').length

  return (
    <section id="tasks" className="tasks-section" aria-labelledby="tasks-title">
      <div className="section-heading">
        <div><p className="eyebrow">ONE THING AT A TIME</p><h2 id="tasks-title">Your tasks</h2></div>
        {!loading && !loadError && <span className="task-summary">{remaining} remaining · {tasks.length - remaining} completed</span>}
      </div>
      {loading ? <p role="status">Loading your tasks…</p> : loadError ? (
        <div className="task-empty"><p className="auth-error" role="alert">{loadError}</p>
          <button className="secondary-button" onClick={() => setReload((value) => value + 1)}>Try again</button>
        </div>
      ) : (
        <>
          <TaskForm key={editingTask?.id ?? 'new'} task={editingTask} busy={busy}
            onSave={save} onCancel={() => setEditingTask(null)} />
          <p className="task-notice" role="status">{notice}</p>
          <div className="task-filters">
            <label htmlFor="status-filter">Status
              <select id="status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as TaskStatus | 'all')}>
                <option value="all">All statuses</option>
                {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label htmlFor="priority-filter">Priority
              <select id="priority-filter" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as TaskPriority | 'all')}>
                <option value="all">All priorities</option>
                {Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>
          {actionError && <p className="auth-error" role="alert">{actionError}</p>}
          {visibleTasks.length === 0 ? <div className="task-empty">
            <h3>{tasks.length ? 'No tasks match these filters.' : 'Start with one small task.'}</h3>
            <p>{tasks.length ? 'Change the status or priority filter to see more.' : 'Add something above. Your tasks will stay saved to your account.'}</p>
          </div> : (
            <ul className="task-list">
              {visibleTasks.map((task) => (
                <li className={`task-row ${task.status === 'completed' ? 'is-completed' : ''}`} key={task.id}>
                  <input type="checkbox" className="task-check" checked={task.status === 'completed'}
                    disabled={busy || editingTask !== null} aria-label={`${task.status === 'completed' ? 'Reopen' : 'Complete'} ${task.title}`}
                    onChange={() => void toggleCompleted(task)} />
                  <div className="task-content">
                    <h3>{task.title}</h3>
                    {task.description && <p className="task-description">{task.description}</p>}
                    <div className="task-meta">
                      <span className={`priority-badge priority-${task.priority}`}>{priorityLabels[task.priority]} priority</span>
                      <span>{statusLabels[task.status]}</span><span>{task.estimated_minutes} min</span>
                      {task.due_date && <span>Due {new Date(`${task.due_date}T00:00:00`).toLocaleDateString()}</span>}
                    </div>
                    {deletingId === task.id && <div className="delete-confirmation">
                      <p>Delete this task permanently?</p>
                      <button className="danger-button" disabled={busy} onClick={() => void remove(task)}>Delete task</button>
                      <button className="secondary-button" disabled={busy} onClick={() => setDeletingId(null)}>Keep task</button>
                    </div>}
                  </div>
                  <div className="task-actions">
                    <button className="text-button" disabled={busy || editingTask !== null} onClick={() => {
                      setEditingTask(task); setDeletingId(null); setActionError(''); setNotice('')
                      document.getElementById('tasks')?.scrollIntoView({ behavior: 'smooth' })
                    }}>Edit<span className="sr-only"> {task.title}</span></button>
                    <button className="text-button danger-text" disabled={busy || editingTask !== null} onClick={() => setDeletingId(task.id)}>
                      Delete<span className="sr-only"> {task.title}</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
