import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { ApiError, request } from '../src/api/client.ts'

const originalFetch = globalThis.fetch
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
afterEach(() => {
  globalThis.fetch = originalFetch
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow)
  else Reflect.deleteProperty(globalThis, 'window')
})

test('requests include session cookies and registration payload', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/auth/register')
    assert.equal(options?.credentials, 'include')
    assert.equal(options?.method, 'POST')
    assert.equal(options?.body, '{"email":"test@example.com"}')
    return Response.json({ id: 'user-1' }, { status: 201 })
  }
  assert.deepEqual(await request('/auth/register', {
    method: 'POST', body: JSON.stringify({ email: 'test@example.com' }),
  }), { id: 'user-1' })
})

test('logout handles the empty 204 response', async () => {
  globalThis.fetch = async () => new Response(null, { status: 204 })
  assert.equal(await request('/auth/logout', { method: 'POST' }), undefined)
})

test('validation errors are readable messages', async () => {
  globalThis.fetch = async () => Response.json({ detail: [
    { loc: ['body', 'display_name'], msg: 'String should have at least 1 character' },
  ] }, { status: 422 })
  await assert.rejects(request('/auth/register'), (error) => {
    assert.ok(error instanceof ApiError)
    assert.equal(error.status, 422)
    assert.match(error.message, /display_name: String should/)
    return true
  })
})

test('failed login and session probes do not emit stale global expiry events', async () => {
  const events: string[] = []
  Object.defineProperty(globalThis, 'window', {
    configurable: true, value: { dispatchEvent: (event: Event) => events.push(event.type) },
  })
  globalThis.fetch = async () => Response.json({ detail: 'Unauthorized' }, { status: 401 })
  await assert.rejects(request('/auth/login'), ApiError)
  await assert.rejects(request('/auth/me'), ApiError)
  assert.deepEqual(events, [])
  await assert.rejects(request('/tasks'), ApiError)
  assert.deepEqual(events, ['lifeos:session-expired'])
})

test('network failures show a connection error', async () => {
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(request('/auth/me'), /Unable to reach LifeOS/)
})

test('non-JSON server errors use the fallback message', async () => {
  globalThis.fetch = async () => new Response('Server unavailable', { status: 503 })
  await assert.rejects(request('/auth/me'), /Something went wrong/)
})
