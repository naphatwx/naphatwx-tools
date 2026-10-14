// step(): one ui step + a screenshot of how it ended. apiStep(): one api call + its masked request and response.
// The run-data reporter pairs them with the step by the "step: <title>" / "call: <title>" attachment names.
import { test, type APIRequestContext, type APIResponse, type Page } from '@playwright/test'

export async function step(page: Page, title: string, body: () => Promise<void>): Promise<void> {
  await test.step(title, async () => {
    let failure: unknown
    try {
      await body()
    } catch (error) {
      failure = error
    }
    const shot = await page.screenshot({ type: 'jpeg', quality: 60, animations: 'disabled' }).catch(() => null)
    if (shot) await test.info().attach(`step: ${title}`, { body: shot, contentType: 'image/jpeg' })
    if (failure) throw failure
  })
}

export type Call = { method: string; url: string; data?: unknown; headers?: Record<string, string> }

const SECRET = /token|secret|password|passwd|cookie|authorization|api[-_]?key|session/i
const MAX = 20000

// Hides secret-looking keys anywhere in a JSON value; the report is shared, so no tokens or cookies.
export function mask(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(mask)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, x]) => [k, SECRET.test(k) ? '***' : mask(x)]))
  return value
}

const parse = (text: string): unknown => {
  try {
    return JSON.parse(text)
  } catch {
    return text.length > MAX ? text.slice(0, MAX) + '…' : text
  }
}

// Sends one request, records it, then runs check(response, body). Returns the parsed body for the next step.
export async function apiStep(
  request: APIRequestContext,
  title: string,
  call: Call,
  check: (response: APIResponse, body: unknown) => Promise<void> | void,
): Promise<unknown> {
  return test.step(title, async () => {
    const recordedRequest = { method: call.method.toUpperCase(), url: call.url, body: mask(call.data) }
    let response: APIResponse | undefined
    let body: unknown
    try {
      response = await request.fetch(call.url, { method: recordedRequest.method, data: call.data, headers: call.headers })
      body = parse(await response.text())
    } catch (error) {
      await attachCall(title, recordedRequest, { error: String((error as Error).message ?? error) })
      throw error
    }
    await attachCall(title, recordedRequest, { status: response.status(), body: mask(body) })
    await check(response, body)
    return body
  })
}

async function attachCall(title: string, request: unknown, response: unknown) {
  const json = JSON.stringify({ request, response }, null, 2)
  await test.info().attach(`call: ${title}`, { body: Buffer.from(json), contentType: 'application/json' })
}
