// Playwright reporter: writes <run dir>/run-data.json + shots/*.jpg; build-report.mjs turns them into one HTML.
// Run dir: E2E_RUN_DIR (read from the cwd, else from the config folder) must sit inside outputDir
// (default e2e-results/, next to the config), or onBegin throws. Unset → <outputDir>/<E2E_SPEC or _adhoc>/.
// The folder is reused: each run replaces the tests it ran, keeps the rest, and prunes unreferenced shots/.
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'

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
  // ISO start of the run that produced this entry; older than RunData.startedAt = kept from an earlier run.
  startedAt?: string
}
// startedAt / stamp / ms / baseURL describe the newest run only.
export type RunData = { name: string; stamp: string; startedAt: string; ms: number; baseURL: string; tests: TestOut[] }

const pad = (number: number) => String(number).padStart(2, '0')
// Built from a char code: a literal ESC in the pattern trips no-control-regex.
const ANSI_COLOUR = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g')
const stripAnsi = (text = '') => text.replace(ANSI_COLOUR, '')
const SPEC_PATTERN = /^[0-9]{3}-[a-z0-9-]+$/
const ADHOC_DIR = '_adhoc'
const safe = (text: string) => text.replace(/[^\w.-]+/g, '_').slice(0, 80)
const inside = (root: string, path: string) => {
  const rest = relative(root, path)
  return rest !== '' && !rest.startsWith('..') && !isAbsolute(rest)
}

// The newest run's entries replace old ones with the same key; an old entry without a time gets its run's.
export const mergeRunData = (old: RunData | undefined, run: Omit<RunData, 'tests'>, fresh: TestOut[]): RunData => {
  const keys = new Set(fresh.map((t) => t.key))
  const kept = (old?.tests ?? []).filter((t) => !keys.has(t.key)).map((t) => ({ ...t, startedAt: t.startedAt ?? old?.startedAt }))
  return { ...run, tests: [...kept, ...fresh] }
}

// Deletes every file in <runDir>/shots/ that no test entry points to.
export const pruneShots = (runDir: string, data: RunData) => {
  const shotsDir = join(runDir, 'shots')
  if (!existsSync(shotsDir)) {
    return
  }
  const used = new Set(data.tests.flatMap((t) => [t.finalShot, ...t.steps.map((s) => s.shot)]).filter((path): path is string => !!path))
  for (const file of readdirSync(shotsDir)) {
    const path = join(shotsDir, file)
    if (!used.has(`shots/${file}`) && statSync(path).isFile()) {
      rmSync(path)
    }
  }
}

export default class RunDataReporter implements Reporter {
  private options: Options
  private rootDir = process.cwd()
  private configDir = process.cwd()
  private runDir = ''
  private name = 'e2e'
  private stamp = ''
  // One entry per test, keyed by test.id; a retry replaces the entry and moves the old one into attempts.
  private tests = new Map<string, TestOut>()
  private started = new Date()

  constructor(options: Options = {}) {
    this.options = options
  }

  onBegin(config: FullConfig, _suite: Suite) {
    this.rootDir = config.rootDir
    this.configDir = config.configFile ? dirname(config.configFile) : config.rootDir
    this.started = new Date()
    const date = this.started
    this.stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
    // E2E_SPEC files the run under e2e-results/<spec>/; unset → _adhoc/. E2E_RUN_DIR still wins.
    const spec = process.env.E2E_SPEC || undefined
    if (spec !== undefined && !SPEC_PATTERN.test(spec)) {
      throw new Error(`E2E_SPEC must be the spec folder name, <NNN>-<slug> in lowercase (e.g. 185-remove-announcement-dismiss); got "${spec}".`)
    }
    this.name = process.env.E2E_REPORT_NAME ?? spec ?? this.options.name ?? 'e2e'
    // Real paths, so a symlinked checkout (e.g. /var vs /private/var) still compares equal.
    const configDir = realpathSync(this.configDir)
    const cwd = realpathSync(process.cwd())
    const resultsRoot = resolve(configDir, this.options.outputDir ?? 'e2e-results')
    const fixed = process.env.E2E_RUN_DIR
    if (fixed) {
      const tries = isAbsolute(fixed) ? [fixed] : [resolve(cwd, fixed), resolve(configDir, fixed)]
      const found = tries.find((path) => inside(resultsRoot, path))
      if (!found) {
        const root = relative(cwd, resultsRoot) || '.'
        throw new Error(
          `E2E_RUN_DIR must be a folder inside ${root}/ (got "${fixed}"). Use e.g. E2E_RUN_DIR=${root}/<spec>, or leave it unset.`
        )
      }
      this.runDir = found
    } else {
      this.runDir = join(resultsRoot, spec ?? ADHOC_DIR)
    }
    mkdirSync(join(this.runDir, 'shots'), { recursive: true })
  }

  // Writes one image into shots/ and returns its path relative to the run dir.
  private save(file: string, body: Buffer) {
    writeFileSync(join(this.runDir, 'shots', file), body)
    return `shots/${file}`
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const named = (prefix: string) => result.attachments.filter((a) => a.name.startsWith(prefix) && a.body)
    const shots = named('step: ')
    const calls = named('call: ')
    const used = new Set<object>()
    const take = (list: typeof shots, name: string) => {
      const attachment = list.find((x) => !used.has(x) && x.name === name)
      if (attachment) {
        used.add(attachment)
      }
      return attachment
    }
    const base = safe(`${test.id}-r${result.retry}`)
    const steps: StepOut[] = result.steps
      .filter((s: TestStep) => s.category === 'test.step')
      .map((step, n) => {
        const shot = take(shots, `step: ${step.title}`)
        const call = take(calls, `call: ${step.title}`)
        const recorded = call ? JSON.parse(call.body!.toString('utf8')) : undefined
        return {
          title: step.title,
          status: step.error ? 'failed' : 'passed',
          ms: step.duration,
          error: step.error ? stripAnsi(step.error.message) : undefined,
          shot: shot ? this.save(`${base}-${n + 1}.jpg`, shot.body!) : undefined,
          call: recorded ? { target: `${recorded.request?.method ?? ''} ${recorded.request?.url ?? ''}`.trim(), request: recorded.request, response: recorded.response } : undefined,
        }
      })
    // Playwright's own failure screenshot is a file on disk, not an in-memory body.
    const failureShot = result.attachments.find((a) => a.name === 'screenshot' && (a.body || a.path))
    const failureBody = failureShot ? failureShot.body ?? readFileSync(failureShot.path!) : undefined
    const extension = failureShot?.contentType === 'image/jpeg' ? 'jpg' : 'png'
    // The trace zip stays on disk; the report shows it relative to the config folder, for `npx playwright show-trace`.
    const trace = result.attachments.find((a) => a.name === 'trace' && a.path)
    const previous = this.tests.get(test.id)
    const attempts = previous ? [...previous.attempts, { retry: previous.retry, status: previous.status, error: previous.error, duration: previous.ms }] : []
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
      finalShot: failureBody ? this.save(`${base}-final.${extension}`, failureBody) : undefined,
      trace: trace ? relative(this.configDir, trace.path!).split('\\').join('/') : undefined,
      annotations,
      attempts,
      useCase: tag('use case'),
      scenario,
      startedAt: this.started.toISOString(),
    })
  }

  onEnd(result: FullResult) {
    const file = join(this.runDir, 'run-data.json')
    const old: RunData | undefined = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : undefined
    const run = {
      name: this.name,
      stamp: this.stamp,
      startedAt: this.started.toISOString(),
      ms: result.duration,
      baseURL: process.env.PW_BASE_URL ?? process.env.BASE_URL ?? old?.baseURL ?? '',
    }
    const fresh = [...this.tests.values()]
    // A run that ran nothing (e.g. --list) leaves an existing folder as it was.
    if (fresh.length > 0 || !old) {
      const data = mergeRunData(old, run, fresh)
      writeFileSync(file, JSON.stringify(data, null, 2))
      pruneShots(this.runDir, data)
    }
    process.stdout.write(`\nE2E run data: ${this.runDir}\n`)
  }

  printsToStdio() {
    return false
  }
}
