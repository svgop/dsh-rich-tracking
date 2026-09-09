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
  const hold = tools.find((t) => t.name === 'tracking_hold')
  assert.notEqual(hold, undefined, 'tracking_hold registered (the executable hold exit)')
  for (const fragment of ['genuinely blocked', 'naming what each open row waits on', 'blocks only execution while preparation or verification remains available qualifies as work']) {
    assert.ok(hold.description.includes(fragment), 'hold description must state: ' + fragment)
  }
  const write = tools.find((t) => t.name === 'tracking_write')
  assert.notEqual(write, undefined, `tracking_write registered among ${tools.map((t) => t.name).join(', ')}`)
  // Every rule the validator enforces must be stated BEFORE the agent's
  // first call, not discovered per rejection. If a new rule lands in
  // validateBoard without landing here, this test fails on purpose.
  for (const fragment of [
    'RULES THE GATE ENFORCES',
    'TOP-LEVEL note <= 400',
    'row.note <= 400 chars',
    'label <= 240',
    'REQUIRES row.evidence',
    'round(done/total x 100)',
    'blocked requires percent < 100',
    'WRITING (the board is read cold',
    'never seen this project',
    'Fix login retry loop',
    'REPLACES the previous board',
    'WRITING (the board is read cold',
    'row.refs 1-12 EXTERNAL reference strings <= 300 chars',
  ]) {
    assert.ok(write.description.includes(fragment), `description must state: ${fragment}`)
  }
  assert.equal(/undefined|NaN|\[object /.test(write.description), false, 'description carries mangled artifacts')

  // The checkpoint contract (2026-09-07): prediction pins, not bare snapshots.
  const checkpoint = tools.find((t) => t.name === 'tracking_checkpoint')
  assert.notEqual(checkpoint, undefined, 'tracking_checkpoint registered')
  for (const fragment of [
    'RULES THE GATE ENFORCES',
    'summary <= 300 chars',
    'expect <= 200 chars',
    'checkpoints audit their predecessor',
    'PRIOR expectation',
  ]) {
    assert.ok(checkpoint.description.includes(fragment), `checkpoint description must state: ${fragment}`)
  }
})

test('the announcement names the workspace record lane (discovery contract)', () => {
  const source = readFileSync(new URL('./host.js', import.meta.url), 'utf8')
  const match = /const ANNOUNCEMENT = `([\s\S]*?)`/.exec(source)
  assert.notEqual(match, null, 'ANNOUNCEMENT found')
  assert.ok(match[1].includes('.dsh/tracking/<sessionId>.json'), 'announcement must point agents at the record lane')
  assert.ok(match[1].includes("prior sessions' records"), 'announcement must tell agents prior records are readable there')
})

test('injected context talks only about tracking — no cross-plugin or ecosystem chatter', async () => {
  const source = readFileSync(new URL('./host.js', import.meta.url), 'utf8')
  const engine = readFileSync(new URL('./tracking-engine.js', import.meta.url), 'utf8')
  for (const [name, text] of [['host', source], ['engine', engine]]) {
    const code = text.split(String.fromCharCode(10)).filter((line) => /^[ \t]*(\/\/|\*|\/\*)/.test(line) === false).join(String.fromCharCode(10))
    const matches = [...code.matchAll(/dsh-[a-z-]+/g)].map((m) => m[0]).filter((n) => n !== 'dsh-rich-tracking' && n !== 'dsh-llm' && n !== 'dsh-agent')
    assert.deepEqual([...new Set(matches)], [], `${name}: foreign plugin references in injected context (operator rule 2026-09-08: a plugin's context covers its own domain only)`)
  }
})
