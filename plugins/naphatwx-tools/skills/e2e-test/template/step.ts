// Runs one named test step and attaches a screenshot of how it ended, pass or fail.
// The one-html reporter pairs each step with its screenshot by the "step: <title>" name.
import { test, type Page } from '@playwright/test'

export async function step(page: Page, title: string, body: () => Promise<void>): Promise<void> {
  await test.step(title, async () => {
    let failure: unknown
    try {
      await body()
    } catch (e) {
      failure = e
    }
    const shot = await page.screenshot({ type: 'jpeg', quality: 60, animations: 'disabled' }).catch(() => null)
    if (shot) await test.info().attach(`step: ${title}`, { body: shot, contentType: 'image/jpeg' })
    if (failure) throw failure
  })
}
