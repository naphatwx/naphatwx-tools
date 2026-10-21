#!/usr/bin/env node
// Smoke runner: triggers each flow's simulation probe, checks every hop in order, writes one HTML report.
// Node 18+, no dependencies. Usage: node scripts/smoke/run.mjs [<env>] [flow ...] [--spec <NNN-slug>] [--out <dir>]
// scripts/smoke/.env (git-ignored) may set SMOKE_ENV and SMOKE_SPEC; the shell, then arguments, win over it.
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const print = (line) => process.stdout.write(line + '\n')
const fatal = (line) => {
  process.stderr.write(line + '\n')
  process.exit(2)
}

const args = process.argv.slice(2)
// How this run was started, relative to the cwd, so the report can show copyable rerun commands.
const script = relative(process.cwd(), fileURLToPath(import.meta.url)) || 'run.mjs'
const quote = (a) => (/^[\w@%+=:,./-]+$/.test(a) ? a : `'${a.replace(/'/g, `'\\''`)}'`)
const command = ['node', script, ...args].map(quote).join(' ')
const dotEnv = join(HERE, '.env')
if (existsSync(dotEnv)) {
  for (const raw of readFileSync(dotEnv, 'utf8').split(/\r?\n/)) {
    const m = raw.trim().match(/^(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/)
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim().replace(/^(['"])(.*)\1$/, '$2')
  }
}
const takeFlag = (name) => {
  const index = args.indexOf(name)
  return index >= 0 ? args.splice(index, 2)[1] : undefined
}
const outFlag = takeFlag('--out')
const spec = takeFlag('--spec') ?? process.env.SMOKE_SPEC ?? ''
if (spec && !/^[0-9]{3}-[a-z0-9-]+$/.test(spec)) fatal(`--spec / SMOKE_SPEC must be a spec folder name like 185-remove-announcement-dismiss, got "${spec}"`)
// One folder per spec (results/<spec>/), _adhoc/ without one. Each env keeps one report there, replaced by its next run.
const outputDirectory = outFlag ?? join(HERE, 'results', spec || '_adhoc')

const envs = JSON.parse(readFileSync(join(HERE, 'envs.json'), 'utf8'))
const [envName, ...onlyFlows] = envs[args[0]] || !process.env.SMOKE_ENV ? args : [process.env.SMOKE_ENV, ...args]
if (!envName) fatal('usage: node scripts/smoke/run.mjs [<env>] [flow ...] [--spec <NNN-slug>] [--out <dir>]  (or set SMOKE_ENV in scripts/smoke/.env)')
const env = envs[envName]
if (!env) fatal(`unknown env "${envName}" — known: ${Object.keys(envs).join(', ')}`)

const flowDirectory = join(HERE, 'flows')
const flows = readdirSync(flowDirectory)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(flowDirectory, f), 'utf8')))
  .filter((f) => onlyFlows.length === 0 || onlyFlows.includes(f.flow))
if (flows.length === 0) fatal(`no flow matched in ${flowDirectory}`)

const secrets = new Set()
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
const sha8 = (value) => 'sha256:' + createHash('sha256').update(String(value)).digest('hex').slice(0, 8)
const mask = (value) => {
  let text = String(value ?? '')
  for (const secret of secrets) if (secret) text = text.split(secret).join('****')
  return text
}

// Base URLs end with "/", paths have no leading "/" — `${base}${path}` never doubles the slash.
function baseOf(service) {
  const base = env.services?.[service]
  if (!base) throw new Error(`envs.json has no base URL for "${service}" in "${envName}"`)
  return base
}

function authHeaders(auth) {
  if (!auth) return {}
  const value = process.env[auth.env]
  if (!value) throw new Error(`env var ${auth.env} is not set (needed for ${auth.type} auth)`)
  secrets.add(value)
  if (auth.type === 'bearer') return { Authorization: `Bearer ${value}` }
  if (auth.type === 'basic') return { Authorization: `Basic ${Buffer.from(value).toString('base64')}` }
  if (auth.type === 'header') return { [auth.header]: value }
  throw new Error(`unknown auth type ${auth.type}`)
}

const BODY_LIMIT = 2000

async function call(service, method, path, { auth, body } = {}) {
  const url = baseOf(service) + path
  const started = Date.now()
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeaders(auth) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(env.requestTimeoutMs ?? 10000),
  })
  const text = await response.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    // not JSON — keep the text only
  }
  return { url, status: response.status, json, text: text.slice(0, BODY_LIMIT), truncated: text.length > BODY_LIMIT, ms: Date.now() - started }
}

const fill = (template, vars) => String(template).replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? `{${name}}`)
const pick = (object, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), object)

// Compare what a service reported it used with what the flow map expects.
function checkEnv(expected = [], reported = {}) {
  return expected.map((expectedVar) => {
    const reportedValue = reported?.[expectedVar.name]
    if (reportedValue === undefined || reportedValue === '') return { name: expectedVar.name, ok: false, note: 'not set or not reported' }
    if (expectedVar.secret) {
      const expectedValue = expectedVar.expectedFrom ? process.env[expectedVar.expectedFrom] : undefined
      if (expectedValue === undefined) return { name: expectedVar.name, ok: true, value: reportedValue, note: 'set (value not compared)' }
      const ok = reportedValue === sha8(expectedValue)
      return { name: expectedVar.name, ok, value: reportedValue, note: ok ? '' : `expected ${sha8(expectedValue)}` }
    }
    const expectedValue = expectedVar.expected?.[envName] ?? expectedVar.expected?.default ?? expectedVar.expected
    if (expectedValue === undefined || typeof expectedValue === 'object') return { name: expectedVar.name, ok: true, value: reportedValue, note: 'no expected value' }
    return { name: expectedVar.name, ok: reportedValue === expectedValue, value: reportedValue, note: reportedValue === expectedValue ? '' : `expected ${expectedValue}` }
  })
}

// One observation of one hop: { ok, detail, env, instance, evidence, entry? },
// or { pending, method, evidence } when it is not there yet, so a timeout can say what was polled.
async function observe(flow, hop, vars) {
  const observeConfig = hop.observe
  if (observeConfig.type === 'store' || observeConfig.type === 'service') {
    const target =
      observeConfig.type === 'store' ? flow.store : { service: hop.service, path: observeConfig.path ?? flow.store.path, auth: observeConfig.auth ?? flow.store.auth }
    const response = await call(target.service, 'GET', fill(target.path, vars), { auth: target.auth })
    if (response.status === 404) return { pending: 'not found', method: 'GET', evidence: response }
    if (response.status !== 200) return { ok: false, detail: `HTTP ${response.status}`, evidence: response }
    const field = observeConfig.hopsField ?? 'hops'
    const list = pick(response.json, field) ?? []
    const index = list.findIndex((h) => h.hop === hop.id)
    if (index < 0) return { pending: `hop "${hop.id}" not in ${field}`, method: 'GET', evidence: response }
    const entry = list[index]
    return {
      ok: entry.ok !== false,
      detail: entry.error ?? entry.note ?? 'reported',
      env: entry.env,
      instance: entry.instance,
      evidence: response,
      entry: { path: `${field}[${index}]`, json: JSON.stringify(entry) },
    }
  }
  if (observeConfig.type === 'http') {
    const method = observeConfig.method ?? 'GET'
    const response = await call(observeConfig.service ?? hop.service, method, fill(observeConfig.path, vars), { auth: observeConfig.auth })
    if (observeConfig.retryOn?.includes(response.status)) return { pending: `HTTP ${response.status} is in retryOn`, method, evidence: response }
    const okStatus = (observeConfig.expectStatus ?? [200]).includes(response.status)
    const field = observeConfig.expectField ? pick(response.json, observeConfig.expectField.path) : undefined
    const okField =
      !observeConfig.expectField || (observeConfig.expectField.equals === undefined ? field !== undefined : field === fill(observeConfig.expectField.equals, vars))
    if (!okStatus || !okField) {
      if (observeConfig.pollUntilMatch) return { pending: 'no match yet', method, evidence: response }
      const shown = observeConfig.expectField ? ` ${observeConfig.expectField.path}=${JSON.stringify(field)}` : ''
      return { ok: false, detail: `HTTP ${response.status}${shown}`, evidence: response }
    }
    return { ok: true, detail: `HTTP ${response.status}`, evidence: response }
  }
  throw new Error(`unknown observe.type "${observeConfig.type}" on hop ${hop.id}`)
}

const shell = (hop, status) => ({ id: hop.id, service: hop.service, from: hop.from, transport: hop.transport, status })
const evidenceOf = (response, entry) =>
  response && {
    url: mask(response.url),
    status: response.status,
    ms: response.ms,
    body: mask(response.text),
    truncated: response.truncated,
    ...(entry && { entryPath: entry.path, entry: mask(entry.json) }),
  }
// "NAME = used (expected want)" for each failed env check; values are already masked.
const envProblem = (check) => (check.value === undefined ? `${check.name} ${check.note}` : `${check.name} = ${check.value}${check.note ? ` (${check.note})` : ''}`)

async function runHop(flow, hop, vars) {
  const timeoutMs = hop.timeoutMs ?? env.hopTimeoutMs ?? 30000
  const started = Date.now()
  let last = null
  const polls = []
  while (Date.now() - started < timeoutMs) {
    try {
      last = await observe(flow, hop, vars)
    } catch (error) {
      last = { ok: false, detail: error.message }
    }
    if (!last.pending) break
    polls.push(last)
    await sleep(hop.pollMs ?? 1000)
  }
  const elapsedMs = Date.now() - started
  if (!last || last.pending) {
    const lastPoll = polls.at(-1)
    const statuses = [...new Set(polls.map((p) => p.evidence.status))]
    return {
      ...shell(hop, 'timed-out'),
      ms: elapsedMs,
      detail: `not observed within ${timeoutMs} ms` + (lastPoll ? ` · ${polls.length} polls, last HTTP ${lastPoll.evidence.status}` : ''),
      polling: lastPoll && {
        polls: polls.length,
        method: lastPoll.method,
        lastUrl: mask(lastPoll.evidence.url),
        lastStatus: lastPoll.evidence.status,
        sameStatus: statuses.length === 1,
        lastReason: mask(lastPoll.pending),
        waitedMs: elapsedMs,
      },
      evidence: evidenceOf(lastPoll?.evidence),
    }
  }
  const envChecks = checkEnv(hop.envVars, last.env).map((c) => ({ ...c, value: c.value === undefined ? undefined : mask(c.value), note: mask(c.note) }))
  const envFailed = envChecks.filter((c) => !c.ok)
  // A failed env check is the cause, so it replaces the service's own success note ("stored").
  const envText = envFailed.map(envProblem).join('; ')
  const detail = envFailed.length ? (last.ok ? envText : `${mask(last.detail)} · ${envText}`) : mask(last.detail)
  return {
    ...shell(hop, last.ok && !envFailed.length ? 'pass' : 'fail'),
    ms: elapsedMs,
    instance: last.instance,
    detail,
    envMismatch: envFailed.length ? envFailed.map((c) => c.name) : undefined,
    env: envChecks,
    evidence: evidenceOf(last.evidence, last.entry),
  }
}

async function runFlow(flow) {
  const started = Date.now()
  const result = {
    flow: flow.flow,
    description: flow.description,
    entry: flow.entry.service,
    rerun: ['node', script, envName, flow.flow, ...(spec ? ['--spec', spec] : []), ...(outFlag ? ['--out', outFlag] : [])].map(quote).join(' '),
    hops: [],
    startedAt: new Date().toISOString(),
  }
  try {
    const entry = flow.entry
    const trigger = await call(entry.service, entry.method ?? 'POST', entry.path, { auth: entry.auth, body: { ...(entry.body ?? {}), flow: flow.flow } })
    const probeId = pick(trigger.json, entry.probeIdField ?? 'probeId')
    result.trigger = { url: trigger.url, status: trigger.status, ms: trigger.ms, body: mask(trigger.text), truncated: trigger.truncated }
    if (trigger.status >= 300 || !probeId) throw new Error(`trigger answered HTTP ${trigger.status} without ${entry.probeIdField ?? 'probeId'}`)
    result.probeId = probeId
  } catch (error) {
    result.status = 'fail'
    result.error = mask(error.message)
    result.hops = flow.hops.map((h) => shell(h, 'not-reached'))
    result.ms = Date.now() - started
    return result
  }
  const vars = { probeId: result.probeId, flow: flow.flow, env: envName }
  let broken = false
  for (const hop of flow.hops) {
    if (broken) {
      result.hops.push(shell(hop, 'not-reached'))
      continue
    }
    const hopResult = await runHop(flow, hop, vars)
    result.hops.push(hopResult)
    if (hopResult.status !== 'pass') broken = true
  }
  result.status = broken ? 'fail' : 'pass'
  result.ms = Date.now() - started
  return result
}

const startedAt = new Date()
const results = await Promise.all(flows.map(runFlow))
const report = {
  env: envName,
  spec: spec || null,
  startedAt: startedAt.toISOString(),
  command,
  ms: Date.now() - startedAt.getTime(),
  status: results.every((r) => r.status === 'pass') ? 'pass' : 'fail',
  flows: results,
}

if (!existsSync(outputDirectory)) mkdirSync(outputDirectory, { recursive: true })
const template = readFileSync(join(HERE, 'report-template.html'), 'utf8')
const data = JSON.stringify(report).replace(/</g, '\\u003c')
const file = join(outputDirectory, `smoke-report-${envName}.html`)
writeFileSync(file, template.replace('/*__SMOKE_DATA__*/null', data))

for (const flowResult of results) {
  const chain = flowResult.hops.map((h) => `${h.service}:${h.status}`).join(' → ')
  print(`${flowResult.status.toUpperCase().padEnd(4)} ${flowResult.flow}  ${chain}${flowResult.error ? `  (${flowResult.error})` : ''}`)
}
print(`report: ${file}`)
process.exit(report.status === 'pass' ? 0 : 1)
