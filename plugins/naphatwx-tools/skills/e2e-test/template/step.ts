// step(): one ui step + a screenshot of how it ended. apiStep(): one api call + its masked request and response.
// The run-data reporter pairs them with the step by the "step: <title>" / "call: <title>" attachment names.
import { test, type APIRequestContext, type APIResponse, type Locator, type Page } from '@playwright/test'

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

// Scrolls target into view below any sticky header and above any sticky footer, so the step's shot shows it.
// Apps often scroll a main pane, not the window: scroll each scrollable ancestor first, then the window.
export async function reveal(target: Locator): Promise<void> {
  await target.waitFor({ state: 'visible' })
  await target.evaluate((element) => {
    const pinned = (node: Element | null) => {
      for (let n = node as HTMLElement | null; n && n !== document.body; n = n.parentElement) {
        const position = getComputedStyle(n).position
        if ((position === 'fixed' || position === 'sticky') && n.offsetHeight < window.innerHeight / 3) return n.contains(element) ? null : n
      }
      return null
    }
    const middle = window.innerWidth / 2
    const head = pinned(document.elementFromPoint(middle, 1))
    const foot = pinned(document.elementFromPoint(middle, window.innerHeight - 2))
    const top = (head?.getBoundingClientRect().bottom ?? 0) + 8
    const bottom = (foot?.getBoundingClientRect().top ?? window.innerHeight) - 8
    const offset = () => {
      const box = element.getBoundingClientRect()
      if (box.top < top) return box.top - top
      if (box.bottom > bottom) return Math.min(box.bottom - bottom, box.top - top)
      return 0
    }
    for (let n = element.parentElement; n && offset(); n = n.parentElement) {
      const overflow = getComputedStyle(n).overflowY
      if ((overflow === 'auto' || overflow === 'scroll') && n.scrollHeight > n.clientHeight) n.scrollTop += offset()
    }
    if (offset()) window.scrollBy(0, offset())
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
