#!/usr/bin/env node
// Smoke runner: triggers each flow's simulation probe, checks every hop in order, writes one HTML report.
// Node 18+, no dependencies. Usage: node scripts/smoke/run.mjs <env> [flow ...] [--out <dir>]
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const out = (line) => process.stdout.write(line + '\n')
const fatal = (line) => {
  process.stderr.write(line + '\n')
  process.exit(2)
}

const args = process.argv.slice(2)
// How this run was started, relative to the cwd, so the report can show copyable rerun commands.
const script = relative(process.cwd(), fileURLToPath(import.meta.url)) || 'run.mjs'
const quote = (a) => (/^[\w@%+=:,./-]+$/.test(a) ? a : `'${a.replace(/'/g, `'\\''`)}'`)
const command = ['node', script, ...args].map(quote).join(' ')
const outIdx = args.indexOf('--out')
const outDir = outIdx >= 0 ? args.splice(outIdx, 2)[1] : join(HERE, 'results')
const [envName, ...onlyFlows] = args
if (!envName) fatal('usage: node scripts/smoke/run.mjs <env> [flow ...] [--out <dir>]')

const envs = JSON.parse(readFileSync(join(HERE, 'envs.json'), 'utf8'))
const env = envs[envName]
if (!env) fatal(`unknown env "${envName}" — known: ${Object.keys(envs).join(', ')}`)

const flowDir = join(HERE, 'flows')
const flows = readdirSync(flowDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(flowDir, f), 'utf8')))
  .filter((f) => onlyFlows.length === 0 || onlyFlows.includes(f.flow))
if (flows.length === 0) fatal(`no flow matched in ${flowDir}`)

const secrets = new Set()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const sha8 = (v) => 'sha256:' + createHash('sha256').update(String(v)).digest('hex').slice(0, 8)
const mask = (s) => {
  let text = String(s ?? '')
  for (const v of secrets) if (v) text = text.split(v).join('****')
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
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeaders(auth) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(env.requestTimeoutMs ?? 10000),
  })
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    // not JSON — keep the text only
  }
  return { url, status: res.status, json, text: text.slice(0, BODY_LIMIT), truncated: text.length > BODY_LIMIT, ms: Date.now() - started }
}

const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`)
const pick = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj)

// Compare what a service reported it used with what the flow map expects.
function checkEnv(expected = [], reported = {}) {
  return expected.map((e) => {
    const got = reported?.[e.name]
    if (got === undefined || got === '') return { name: e.name, ok: false, note: 'not set or not reported' }
    if (e.secret) {
      const want = e.expectedFrom ? process.env[e.expectedFrom] : undefined
      if (want === undefined) return { name: e.name, ok: true, value: got, note: 'set (value not compared)' }
      const ok = got === sha8(want)
      return { name: e.name, ok, value: got, note: ok ? '' : `expected ${sha8(want)}` }
    }
    const want = e.expected?.[envName] ?? e.expected?.default ?? e.expected
    if (want === undefined || typeof want === 'object') return { name: e.name, ok: true, value: got, note: 'no expected value' }
    return { name: e.name, ok: got === want, value: got, note: got === want ? '' : `expected ${want}` }
  })
}

// One observation of one hop: { ok, detail, env, instance, evidence, entry? },
// or { pending, method, evidence } when it is not there yet, so a timeout can say what was polled.
async function observe(flow, hop, vars) {
  const o = hop.observe
  if (o.type === 'store' || o.type === 'service') {
    const target =
      o.type === 'store' ? flow.store : { service: hop.service, path: o.path ?? flow.store.path, auth: o.auth ?? flow.store.auth }
    const r = await call(target.service, 'GET', fill(target.path, vars), { auth: target.auth })
    if (r.status === 404) return { pending: 'not found', method: 'GET', evidence: r }
    if (r.status !== 200) return { ok: false, detail: `HTTP ${r.status}`, evidence: r }
    const field = o.hopsField ?? 'hops'
    const list = pick(r.json, field) ?? []
    const index = list.findIndex((h) => h.hop === hop.id)
    if (index < 0) return { pending: `hop "${hop.id}" not in ${field}`, method: 'GET', evidence: r }
    const entry = list[index]
    return {
      ok: entry.ok !== false,
      detail: entry.error ?? entry.note ?? 'reported',
      env: entry.env,
      instance: entry.instance,
      evidence: r,
      entry: { path: `${field}[${index}]`, json: JSON.stringify(entry) },
    }
  }
  if (o.type === 'http') {
    const method = o.method ?? 'GET'
    const r = await call(o.service ?? hop.service, method, fill(o.path, vars), { auth: o.auth })
    if (o.retryOn?.includes(r.status)) return { pending: `HTTP ${r.status} is in retryOn`, method, evidence: r }
    const okStatus = (o.expectStatus ?? [200]).includes(r.status)
    const field = o.expectField ? pick(r.json, o.expectField.path) : undefined
    const okField =
      !o.expectField || (o.expectField.equals === undefined ? field !== undefined : field === fill(o.expectField.equals, vars))
    if (!okStatus || !okField) {
      if (o.pollUntilMatch) return { pending: 'no match yet', method, evidence: r }
      const shown = o.expectField ? ` ${o.expectField.path}=${JSON.stringify(field)}` : ''
      return { ok: false, detail: `HTTP ${r.status}${shown}`, evidence: r }
    }
    return { ok: true, detail: `HTTP ${r.status}`, evidence: r }
  }
  throw new Error(`unknown observe.type "${o.type}" on hop ${hop.id}`)
}

const shell = (hop, status) => ({ id: hop.id, service: hop.service, from: hop.from, transport: hop.transport, status })
const evidenceOf = (r, entry) =>
  r && {
    url: mask(r.url),
    status: r.status,
    ms: r.ms,
    body: mask(r.text),
    truncated: r.truncated,
    ...(entry && { entryPath: entry.path, entry: mask(entry.json) }),
  }
// "NAME = used (expected want)" for each failed env check; values are already masked.
const envProblem = (c) => (c.value === undefined ? `${c.name} ${c.note}` : `${c.name} = ${c.value}${c.note ? ` (${c.note})` : ''}`)

async function runHop(flow, hop, vars) {
  const timeoutMs = hop.timeoutMs ?? env.hopTimeoutMs ?? 30000
  const started = Date.now()
  let last = null
  const polls = []
  while (Date.now() - started < timeoutMs) {
    try {
      last = await observe(flow, hop, vars)
    } catch (e) {
      last = { ok: false, detail: e.message }
    }
    if (!last.pending) break
    polls.push(last)
    await sleep(hop.pollMs ?? 1000)
  }
  const ms = Date.now() - started
  if (!last || last.pending) {
    const end = polls.at(-1)
    const statuses = [...new Set(polls.map((p) => p.evidence.status))]
    return {
      ...shell(hop, 'timed-out'),
      ms,
      detail: `not observed within ${timeoutMs} ms` + (end ? ` · ${polls.length} polls, last HTTP ${end.evidence.status}` : ''),
      polling: end && {
        polls: polls.length,
        method: end.method,
        lastUrl: mask(end.evidence.url),
        lastStatus: end.evidence.status,
        sameStatus: statuses.length === 1,
        lastReason: mask(end.pending),
        waitedMs: ms,
      },
      evidence: evidenceOf(end?.evidence),
    }
  }
  const envChecks = checkEnv(hop.envVars, last.env).map((c) => ({ ...c, value: c.value === undefined ? undefined : mask(c.value), note: mask(c.note) }))
  const envFailed = envChecks.filter((c) => !c.ok)
  // A failed env check is the cause, so it replaces the service's own success note ("stored").
  const envText = envFailed.map(envProblem).join('; ')
  const detail = envFailed.length ? (last.ok ? envText : `${mask(last.detail)} · ${envText}`) : mask(last.detail)
  return {
    ...shell(hop, last.ok && !envFailed.length ? 'pass' : 'fail'),
    ms,
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
    rerun: ['node', script, envName, flow.flow, ...(outIdx >= 0 ? ['--out', outDir] : [])].map(quote).join(' '),
    hops: [],
    startedAt: new Date().toISOString(),
  }
  try {
    const e = flow.entry
    const trigger = await call(e.service, e.method ?? 'POST', e.path, { auth: e.auth, body: { ...(e.body ?? {}), flow: flow.flow } })
    const probeId = pick(trigger.json, e.probeIdField ?? 'probeId')
    result.trigger = { url: trigger.url, status: trigger.status, ms: trigger.ms, body: mask(trigger.text), truncated: trigger.truncated }
    if (trigger.status >= 300 || !probeId) throw new Error(`trigger answered HTTP ${trigger.status} without ${e.probeIdField ?? 'probeId'}`)
    result.probeId = probeId
  } catch (e) {
    result.status = 'fail'
    result.error = mask(e.message)
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
    const r = await runHop(flow, hop, vars)
    result.hops.push(r)
    if (r.status !== 'pass') broken = true
  }
  result.status = broken ? 'fail' : 'pass'
  result.ms = Date.now() - started
  return result
}

const startedAt = new Date()
const results = await Promise.all(flows.map(runFlow))
const report = {
  env: envName,
  startedAt: startedAt.toISOString(),
  command,
  ms: Date.now() - startedAt.getTime(),
  status: results.every((r) => r.status === 'pass') ? 'pass' : 'fail',
  flows: results,
}

const pad = (n) => String(n).padStart(2, '0')
const d = startedAt
const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })
const template = readFileSync(join(HERE, 'report-template.html'), 'utf8')
const data = JSON.stringify(report).replace(/</g, '\\u003c')
const file = join(outDir, `smoke-report-${envName}-${stamp}.html`)
writeFileSync(file, template.replace('/*__SMOKE_DATA__*/null', data))

for (const r of results) {
  const chain = r.hops.map((h) => `${h.service}:${h.status}`).join(' → ')
  out(`${r.status.toUpperCase().padEnd(4)} ${r.flow}  ${chain}${r.error ? `  (${r.error})` : ''}`)
}
out(`report: ${file}`)
process.exit(report.status === 'pass' ? 0 : 1)
