// Playwright reporter that writes the run as data, not HTML: <run dir>/run-data.json + shots/*.jpg.
// build-report.mjs later merges it with the AI tester's results and the review into one HTML.
// Options: { name?, outputDir? } (outputDir is relative to the Playwright config folder). E2E_RUN_DIR picks the run dir.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, relative } from 'node:path'
import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult, TestStep } from '@playwright/test/reporter'

type Options = { name?: string; outputDir?: string }
type CallOut = { target: string; request: unknown; response: unknown }
type StepOut = { title: string; status: 'passed' | 'failed'; ms: number; error?: string; shot?: string; call?: CallOut }
type Attempt = { retry: number; status: string; error?: string; duration: number }
type Note = { type: string; description?: string }
type TestOut = {
  key: string
  title: string
  file: string
  project: string
  status: string
  // Playwright's verdict across all attempts: expected | unexpected | flaky | skipped.
  outcome: string
  ms: number
  retry: number
  error?: string
  steps: StepOut[]
  finalShot?: string
  trace?: string
  annotations: Note[]
  attempts: Attempt[]
  // From the `use case` and `scenario` annotations: ids from use-cases.js.
  useCase?: string
  scenario?: string
}
type RunData = { name: string; stamp: string; startedAt: string; ms: number; baseURL: string; tests: TestOut[] }

const pad = (n: number) => String(n).padStart(2, '0')
const stripAnsi = (s = '') => s.replace(/\u001b\[[0-9;]*m/g, '')
const safe = (s: string) => s.replace(/[^\w.-]+/g, '_').slice(0, 80)

export default class RunDataReporter implements Reporter {
  private opts: Options
  private rootDir = process.cwd()
  private configDir = process.cwd()
  private dir = ''
  private name = 'e2e'
  private stamp = ''
  // One entry per test, keyed by test.id; a retry replaces the entry and moves the old one into attempts.
  private tests = new Map<string, TestOut>()
  private started = new Date()

  constructor(opts: Options = {}) {
    this.opts = opts
  }

  onBegin(config: FullConfig, _suite: Suite) {
    this.rootDir = config.rootDir
    this.configDir = config.configFile ? dirname(config.configFile) : config.rootDir
    this.started = new Date()
    const d = this.started
    this.stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
    this.name = process.env.E2E_REPORT_NAME ?? this.opts.name ?? 'e2e'
    const fixed = process.env.E2E_RUN_DIR
    this.dir = fixed
      ? (isAbsolute(fixed) ? fixed : join(this.configDir, fixed))
      : join(this.configDir, this.opts.outputDir ?? 'e2e-results', `${this.name}-${this.stamp}`)
    mkdirSync(join(this.dir, 'shots'), { recursive: true })
  }

  // Writes one image into shots/ and returns its path relative to the run dir.
  private save(file: string, body: Buffer) {
    writeFileSync(join(this.dir, 'shots', file), body)
    return `shots/${file}`
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const named = (prefix: string) => result.attachments.filter((a) => a.name.startsWith(prefix) && a.body)
    const shots = named('step: ')
    const calls = named('call: ')
    const used = new Set<object>()
    const take = (list: typeof shots, name: string) => {
      const a = list.find((x) => !used.has(x) && x.name === name)
      if (a) used.add(a)
      return a
    }
    const base = safe(`${test.id}-r${result.retry}`)
    const steps: StepOut[] = result.steps
      .filter((s: TestStep) => s.category === 'test.step')
      .map((s, n) => {
        const shot = take(shots, `step: ${s.title}`)
        const call = take(calls, `call: ${s.title}`)
        const rec = call ? JSON.parse(call.body!.toString('utf8')) : undefined
        return {
          title: s.title,
          status: s.error ? 'failed' : 'passed',
          ms: s.duration,
          error: s.error ? stripAnsi(s.error.message) : undefined,
          shot: shot ? this.save(`${base}-${n + 1}.jpg`, shot.body!) : undefined,
          call: rec ? { target: `${rec.request?.method ?? ''} ${rec.request?.url ?? ''}`.trim(), request: rec.request, response: rec.response } : undefined,
        }
      })
    // Playwright's own failure screenshot is a file on disk, not an in-memory body.
    const failShot = result.attachments.find((a) => a.name === 'screenshot' && (a.body || a.path))
    const failBody = failShot ? failShot.body ?? readFileSync(failShot.path!) : undefined
    const ext = failShot?.contentType === 'image/jpeg' ? 'jpg' : 'png'
    // The trace zip stays on disk; the report shows it relative to the config folder, for `npx playwright show-trace`.
    const trace = result.attachments.find((a) => a.name === 'trace' && a.path)
    const prev = this.tests.get(test.id)
    const attempts = prev ? [...prev.attempts, { retry: prev.retry, status: prev.status, error: prev.error, duration: prev.ms }] : []
    const tag = (type: string) => test.annotations.find((a) => a.type === type)?.description
    const seen = new Set<string>()
    const annotations = [...test.annotations, ...((result as { annotations?: Note[] }).annotations ?? [])]
      .filter((a) => ['skip', 'fixme', 'fail'].includes(a.type))
      .filter((a) => !seen.has(a.type + a.description) && seen.add(a.type + a.description))
      .map((a) => ({ type: a.type, description: a.description }))
    const scenario = tag('scenario')
    const file = relative(this.rootDir, test.location.file) + ':' + test.location.line
    this.tests.set(test.id, {
      key: scenario ?? file + ' ' + test.title,
      title: test.titlePath().slice(3).join(' › ') || test.title,
      file,
      project: test.parent.project()?.name ?? '',
      status: result.status,
      outcome: test.outcome(),
      ms: result.duration,
      retry: result.retry,
      error: result.error ? stripAnsi(result.error.message) : undefined,
      steps,
      finalShot: failBody ? this.save(`${base}-final.${ext}`, failBody) : undefined,
      trace: trace ? relative(this.configDir, trace.path!).split('\\').join('/') : undefined,
      annotations,
      attempts,
      useCase: tag('use case'),
      scenario,
    })
  }

  onEnd(result: FullResult) {
    const file = join(this.dir, 'run-data.json')
    // A re-run into the same E2E_RUN_DIR replaces only the tests it ran and keeps the rest.
    const old: RunData | undefined = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : undefined
    const fresh = [...this.tests.values()]
    const keys = new Set(fresh.map((t) => t.key))
    const data: RunData = {
      name: old?.name ?? this.name,
      stamp: old?.stamp ?? this.stamp,
      startedAt: old?.startedAt ?? this.started.toISOString(),
      ms: (old?.ms ?? 0) + result.duration,
      baseURL: process.env.PW_BASE_URL ?? process.env.BASE_URL ?? old?.baseURL ?? '',
      tests: [...(old?.tests ?? []).filter((t) => !keys.has(t.key)), ...fresh],
    }
    writeFileSync(file, JSON.stringify(data, null, 2))
    process.stdout.write(`\nE2E run data: ${this.dir}\n`)
  }

  printsToStdio() {
    return false
  }
}
