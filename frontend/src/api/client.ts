const API_BASE_URL = '/api'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type ErrorBody = {
  detail?: string | { msg?: string; loc?: (string | number)[] }[]
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
  } catch {
    throw new Error('Unable to reach LifeOS. Check your connection and try again.')
  }

  if (!response.ok) {
    const error: ErrorBody = await response.json().catch(() => ({}))
    const detail = error.detail
    const message = typeof detail === 'string'
      ? detail
      : Array.isArray(detail)
        ? detail.map((item) => `${item.loc?.slice(1).join(' ') || 'Input'}: ${item.msg || 'Invalid value'}`).join('. ')
        : 'Something went wrong. Please try again.'

    // Failed login credentials should stay on the form, not expire a session.
    if (response.status === 401 && endpoint !== '/auth/login' && endpoint !== '/auth/me') {
      window.dispatchEvent(new Event('lifeos:session-expired'))
    }
    throw new ApiError(message, response.status)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export { request }
