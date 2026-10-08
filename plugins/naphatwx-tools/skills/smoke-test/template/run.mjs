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

// One observation of one hop: { ok, detail, env, instance, evidence }, or null when it is not there yet.
async function observe(flow, hop, vars) {
  const o = hop.observe
  if (o.type === 'store' || o.type === 'service') {
    const target =
      o.type === 'store' ? flow.store : { service: hop.service, path: o.path ?? flow.store.path, auth: o.auth ?? flow.store.auth }
    const r = await call(target.service, 'GET', fill(target.path, vars), { auth: target.auth })
    if (r.status === 404) return null
    if (r.status !== 200) return { ok: false, detail: `HTTP ${r.status}`, evidence: r }
    const entry = (pick(r.json, o.hopsField ?? 'hops') ?? []).find((h) => h.hop === hop.id)
    if (!entry) return null
    return { ok: entry.ok !== false, detail: entry.error ?? entry.note ?? 'reported', env: entry.env, instance: entry.instance, evidence: r }
  }
  if (o.type === 'http') {
    const r = await call(o.service ?? hop.service, o.method ?? 'GET', fill(o.path, vars), { auth: o.auth })
    if (o.retryOn?.includes(r.status)) return null
    const okStatus = (o.expectStatus ?? [200]).includes(r.status)
    const field = o.expectField ? pick(r.json, o.expectField.path) : undefined
    const okField =
      !o.expectField || (o.expectField.equals === undefined ? field !== undefined : field === fill(o.expectField.equals, vars))
    if (!okStatus || !okField) {
      if (o.pollUntilMatch) return null
      const shown = o.expectField ? ` ${o.expectField.path}=${JSON.stringify(field)}` : ''
      return { ok: false, detail: `HTTP ${r.status}${shown}`, evidence: r }
    }
    return { ok: true, detail: `HTTP ${r.status}`, evidence: r }
  }
  throw new Error(`unknown observe.type "${o.type}" on hop ${hop.id}`)
}

const shell = (hop, status) => ({ id: hop.id, service: hop.service, from: hop.from, transport: hop.transport, status })

async function runHop(flow, hop, vars) {
  const timeoutMs = hop.timeoutMs ?? env.hopTimeoutMs ?? 30000
  const started = Date.now()
  let last = null
  while (Date.now() - started < timeoutMs) {
    try {
      last = await observe(flow, hop, vars)
    } catch (e) {
      last = { ok: false, detail: e.message }
    }
    if (last) break
    await sleep(hop.pollMs ?? 1000)
  }
  const ms = Date.now() - started
  if (!last) return { ...shell(hop, 'timed-out'), ms, detail: `not observed within ${timeoutMs} ms` }
  const envChecks = checkEnv(hop.envVars, last.env)
  const envOk = envChecks.every((c) => c.ok)
  return {
    ...shell(hop, last.ok && envOk ? 'pass' : 'fail'),
    ms,
    instance: last.instance,
    detail: mask(last.detail) + (envOk ? '' : ' · env var mismatch'),
    env: envChecks.map((c) => ({ ...c, value: mask(c.value), note: mask(c.note) })),
    evidence: last.evidence
      ? { url: last.evidence.url, status: last.evidence.status, ms: last.evidence.ms, body: mask(last.evidence.text), truncated: last.evidence.truncated }
      : undefined,
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
