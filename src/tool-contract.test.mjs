import { test } from 'node:test'
import assert from 'node:assert/strict'
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
  ]) {
    assert.ok(write.description.includes(fragment), `description must state: ${fragment}`)
  }
  assert.equal(/undefined|NaN|\[object /.test(write.description), false, 'description carries mangled artifacts')
})
