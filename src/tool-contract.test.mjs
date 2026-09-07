import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { apply } from './host.js'

test('tracking_write registers with the full gate contract in its description', () => {
  const tools = []
  const ctx = {
    inject(names, body) {
      const scope = { effect: () => () => {} }
      for (const name of names) scope[name] = { register: () => () => {} }
      body(scope)
    },
    effect(fn) { fn(); return () => {} },
    on() { return () => {} },
    tools: { register(def) { tools.push(def) } },
    webServer: { register() { return () => {} } },
    agents: {},
    systemPrompt: { section() {} },
  }
  apply(ctx)
  const write = tools.find((t) => t.name === 'tracking_write')
  assert.notEqual(write, undefined, `tracking_write registered among ${tools.map((t) => t.name).join(', ')}`)
  // Every rule the validator enforces must be stated BEFORE the agent's
  // first call, not discovered per rejection. If a new rule lands in
  // validateBoard without landing here, this test fails on purpose.
  for (const fragment of [
    'RULES THE GATE ENFORCES',
    'TOP-LEVEL note <= 200',
    'REQUIRES row.evidence',
    'round(done/total x 100)',
    'blocked requires percent < 100',
    'REPLACES the previous board',
    'row.refs 1-12 EXTERNAL reference strings <= 300 chars',
  ]) {
    assert.ok(write.description.includes(fragment), `description must state: ${fragment}`)
  }
  assert.equal(/undefined|NaN|\[object /.test(write.description), false, 'description carries mangled artifacts')
})

test('the announcement names the workspace record lane (discovery contract)', () => {
  const source = readFileSync(new URL('./host.js', import.meta.url), 'utf8')
  const match = /const ANNOUNCEMENT = `([\s\S]*?)`/.exec(source)
  assert.notEqual(match, null, 'ANNOUNCEMENT found')
  assert.ok(match[1].includes('.dsh/tracking/<sessionId>.json'), 'announcement must point agents at the record lane')
  assert.ok(match[1].includes("prior sessions' records"), 'announcement must tell agents prior records are readable there')
})
