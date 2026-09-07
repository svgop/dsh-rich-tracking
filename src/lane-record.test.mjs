/** The workspace track-record lane: every tracking_write shadows the folded
 * board into <workspace>/.dsh/tracking/<sessionId>.json — the same .dsh/
 * convention the harness uses for workspace-local state. Behavioral test:
 * real tool execution against a temp workspace, file inspected on disk. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apply } from './host.js'

test('tracking_write shadows the board into the workspace .dsh/tracking lane', async () => {
  const ws = await mkdtemp(join(tmpdir(), 'lane-'))
  const tools = []
  const events = []
  const session = {
    header: { id: 'session-lane-1', cwd: ws },
    ownEvents: () => events,
    append: (type, data) => { events.push({ type, data, seq: events.length }) },
  }
  apply({
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
  })
  const write = tools.find((t) => t.name === 'tracking_write')
  const result = await write.execute(
    { rows: [{ id: 'w1', label: 'Lane write', percent: 100, evidence: 'test: 1/1' }], note: 'seed' },
    { agent: { session } },
  )
  assert.ok(Array.isArray(result.rows))

  const laneDir = join(ws, '.dsh', 'tracking')
  const files = await readdir(laneDir)
  assert.deepEqual(files, ['session-lane-1.json'])
  const record = JSON.parse(await readFile(join(laneDir, 'session-lane-1.json'), 'utf8'))
  assert.equal(record.sessionId, 'session-lane-1')
  assert.equal(record.workspace, ws)
  assert.equal(record.board.present, true)
  assert.equal(record.board.rows.length, 1)
  assert.equal(record.board.rows[0].percent, 100)
  await rm(ws, { recursive: true, force: true })
})

test('a checkpoint mutation refreshes the same lane file with the checkpoint appended', async () => {
  const ws = await mkdtemp(join(tmpdir(), 'lane-'))
  const tools = []
  const events = []
  const session = {
    header: { id: 'session-lane-2', cwd: ws },
    ownEvents: () => events,
    append: (type, data) => { events.push({ type, data, seq: events.length }) },
  }
  apply({
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
  })
  const checkpoint = tools.find((t) => t.name === 'tracking_checkpoint')
  // checkpoint requires git probe against cwd; temp dir has no git — it must
  // still settle (probe returns null) and still write the lane record.
  await checkpoint.execute({}, { agent: { session } })
  const record = JSON.parse(await readFile(join(ws, '.dsh', 'tracking', 'session-lane-2.json'), 'utf8'))
  assert.ok(Array.isArray(record.checkpoints) && record.checkpoints.length === 1)
  await rm(ws, { recursive: true, force: true })
})
