// Playwright reporter that writes the whole run as ONE self-contained HTML file, with every step's screenshot inside.
// Options: { name?, outputDir?, template? } — both paths are relative to the Playwright config file's folder.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult, TestStep } from '@playwright/test/reporter'

type Options = { name?: string; outputDir?: string; template?: string }
type StepOut = { title: string; status: 'passed' | 'failed'; ms: number; error?: string; shot?: string }
type TestOut = {
  title: string
  file: string
  project: string
  status: string
  ms: number
  retry: number
  error?: string
  steps: StepOut[]
  finalShot?: string
  trace?: string
}

const pad = (n) => String(n).padStart(2, '0')
const stripAnsi = (s = '') => s.replace(/\u001b\[[0-9;]*m/g, '')

export default class OneHtmlReporter implements Reporter {
  private opts: Options
  private rootDir = process.cwd()
  private configDir = process.cwd()
  private tests: TestOut[] = []
  private started = new Date()

  constructor(opts: Options = {}) {
    this.opts = opts
  }

  onBegin(config: FullConfig, _suite: Suite) {
    this.rootDir = config.rootDir
    this.configDir = config.configFile ? dirname(config.configFile) : config.rootDir
    this.started = new Date()
  }

  private outDir() {
    return join(this.configDir, this.opts.outputDir ?? 'e2e-results')
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const shots = result.attachments.filter((a) => a.name.startsWith('step: ') && a.body)
    const used = new Set<number>()
    const take = (title: string) => {
      const i = shots.findIndex((a, n) => !used.has(n) && a.name === `step: ${title}`)
      if (i < 0) return undefined
      used.add(i)
      return `data:${shots[i].contentType};base64,${shots[i].body!.toString('base64')}`
    }
    const steps: StepOut[] = result.steps
      .filter((s: TestStep) => s.category === 'test.step')
      .map((s) => ({ title: s.title, status: s.error ? 'failed' : 'passed', ms: s.duration, error: s.error ? stripAnsi(s.error.message) : undefined, shot: take(s.title) }))
    // Playwright's own failure screenshot is a file on disk, not an in-memory body.
    const failShot = result.attachments.find((a) => a.name === 'screenshot' && (a.body || a.path))
    const failBody = failShot ? failShot.body ?? readFileSync(failShot.path!) : undefined
    // The trace zip stays on disk; the report links to it relative to its own folder.
    const trace = result.attachments.find((a) => a.name === 'trace' && a.path)
    this.tests.push({
      title: test.titlePath().slice(3).join(' › ') || test.title,
      file: relative(this.rootDir, test.location.file) + ':' + test.location.line,
      project: test.parent.project()?.name ?? '',
      status: result.status,
      ms: result.duration,
      retry: result.retry,
      error: result.error ? stripAnsi(result.error.message) : undefined,
      steps,
      finalShot: failShot && failBody ? `data:${failShot.contentType};base64,${failBody.toString('base64')}` : undefined,
      trace: trace ? relative(this.outDir(), trace.path!).split('\\').join('/') : undefined,
    })
  }

  onEnd(result: FullResult) {
    const name = process.env.E2E_REPORT_NAME ?? this.opts.name ?? 'e2e'
    const d = this.started
    const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
    const outDir = this.outDir()
    // Resolved from the config folder, not __dirname: the reporter may load as ESM or CJS depending on the project.
    const template = readFileSync(join(this.configDir, this.opts.template ?? 'reporters/e2e-report-template.html'), 'utf8')
    const data = {
      name,
      status: result.status,
      startedAt: this.started.toISOString(),
      ms: result.duration,
      baseURL: process.env.PW_BASE_URL ?? process.env.BASE_URL ?? '',
      tests: this.tests,
    }
    const file = join(outDir, `e2e-report-${name}-${stamp}.html`)
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, template.replace('/*__E2E_DATA__*/null', JSON.stringify(data).replace(/</g, '\\u003c')))
    process.stdout.write(`\nE2E report: ${file}\n`)
  }

  printsToStdio() {
    return false
  }
}
