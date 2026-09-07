/**
 * Route-level contract for the Tracks dialog dismiss (v0.5): executes the
 * REAL /action handler captured out of apply() against stub HTTP req/res and
 * a Session-shaped agent stub. The dock keeps the open-rows guard; the
 * dialog (source:'dialog') may close any track (operator 2026-09-07).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { apply } from './host.js'

const openRow = { id: 'w2', label: 'Write tests', percent: 40, evidence: 'src/: 2/5', status: 'active' }
const boardEvent = (rows) => ({ type: 'tracking/write', seq: 1, at: 1, data: { revision: 1, rows, at: 1 } })

function makeAgent(events) {
  return {
    id: 'session-test',
    status: 'idle',
    session: {
      header: { id: 'session-test', seedLength: 0 },
      ownEvents: () => events,
      appended: [],
      append(type, data) { this.appended.push({ type, data }) },
    },
    injected: [],
    followups: [],
    inject(message) { this.injected.push(message) },
    followup(message) { this.followups.push(message) },
    steer(message) { this.followups.push(message) },
  }
}

/** Capture the real route handlers out of apply(). */
function captureRoutes(agent) {
  const routes = new Map()
  const ctx = {
    inject(names, body) {
      const scope = { effect: (fn) => { fn(); return () => {} } }
      for (const name of names) scope[name] = { register: () => () => {} }
      if (names.includes('commands')) scope.commands = { register: () => () => {} }
      body(scope)
    },
    effect(fn) { return fn() ?? (() => {}) },
    on() { return () => {} },
    tools: { register() {} },
    webServer: { register(route) { routes.set(route.path, route.handler); return () => {} } },
    agents: { get: (id) => (id === 'session-test' ? agent : undefined) },
    systemPrompt: { section() {} },
  }
  apply(ctx)
  const handler = routes.get('/api/rich-tracking/action')
  assert.notEqual(handler, undefined, 'action route registered')
  return handler
}

async function call(handler, body) {
  const raw = JSON.stringify(body)
  const req = {
    method: 'POST',
    url: '/api/rich-tracking/action',
    headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' },
    socket: { remoteAddress: '127.0.0.1' },
    async *[Symbol.asyncIterator]() { yield Buffer.from(raw, 'utf8') },
  }
  const res = {
    ended: false,
    status: null,
    body: null,
    get writableEnded() { return this.ended },
    writeHead(status, headers) { this.status = status; this.headers = headers },
    end(chunk) { this.ended = true; this.body = chunk === undefined ? null : JSON.parse(chunk) },
  }
  await handler(req, res)
  return res
}

test('dock dismiss on open rows stays blocked (operator rule 2026-08-28)', async () => {
  const agent = makeAgent([boardEvent([openRow])])
  const handler = captureRoutes(agent)
  const res = await call(handler, { sessionId: 'session-test', kind: 'dismiss' })
  assert.equal(res.status, 400)
  assert.match(res.body.error, /board-dismiss-blocked/)
  assert.equal(agent.session.appended.length, 0, 'no decision appended for a refused dismiss')
})

test('dialog dismiss (source:dialog) closes a board with open rows', async () => {
  const agent = makeAgent([boardEvent([openRow])])
  const handler = captureRoutes(agent)
  const res = await call(handler, { sessionId: 'session-test', kind: 'dismiss', source: 'dialog' })
  assert.equal(res.status, 200)
  assert.equal(res.body.ok, true)
  assert.equal(res.body.delivered, 'inject', 'dismiss lands as a quiet inject, not a whip')
  assert.equal(agent.session.appended.length, 1)
  assert.equal(agent.session.appended[0].type, 'tracking/decision')
  assert.equal(agent.session.appended[0].data.kind, 'dismiss')
  assert.equal(agent.injected.length, 1, 'the dismiss instruction reached the agent')
})

test('unknown source values are rejected, not silently ignored', async () => {
  const agent = makeAgent([boardEvent([openRow])])
  const handler = captureRoutes(agent)
  const res = await call(handler, { sessionId: 'session-test', kind: 'play', source: 'dock' })
  assert.equal(res.status, 400)
  assert.equal(res.body.error, 'invalid-action')
})

test('scout delivers the ONE-subagent queue brief through the real route', async () => {
  const rows = [
    { id: 'r1', label: 'Lane one', percent: 20, status: 'active', evidence: 'x: 1/5' },
    { id: 'r2', label: 'Lane two', percent: 0 },
    { id: 'r3', label: 'Lane three', percent: 0 },
  ]
  const agent = makeAgent([boardEvent(rows)])
  const handler = captureRoutes(agent)
  const res = await call(handler, { sessionId: 'session-test', kind: 'scout' })
  assert.equal(res.status, 200)
  assert.equal(res.body.delivered, 'followup', 'scout lands as a followup on an idle agent')
  const message = agent.followups[0]
  const text = message.content.find((block) => block.type === 'text').text
  assert.match(text, /ONE subagent, sequential queue, NO fan-out/)
  assert.match(text, /Launch ONE continuable background subagent/)
  assert.match(text, /LANES 2-3 — send_message payloads/)
  assert.equal((text.match(/TASK: study 3-6 competitors/g) ?? []).length, 3, 'every lane payload is self-contained')
  assert.match(text, /send_message \(one message per lane, in order\)/)
})
