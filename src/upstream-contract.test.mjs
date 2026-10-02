/** 0.2.0 desktop-contract regressions (the "host process predates Tracks" fix):
 *  1. the STATIC inject must not name sessionEventTypes — upstream (>= 0.2.0)
 *     has no such service and a static inject on a missing service leaves the
 *     fiber PENDING forever: apply() never ran, every route 404'd;
 *  2. upstream mode (no admission): mutations journal + write the v2 record
 *     and NEVER touch session.append — a bare unknown append would poison the
 *     log for every later read (validateStoredEvents refuses unknown types
 *     without the ignorable envelope marker, which Session.append cannot set);
 *  3. a fresh Session object hydrates its journal from the v2 record, so the
 *     board survives a host restart on upstream runtimes. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apply, inject as staticInject } from './host.js'

function fakeCtx(tools) {
  return {
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
}

test('the static inject no longer names the removed sessionEventTypes service', () => {
  assert.deepEqual(
    staticIncludes(staticInject, 'sessionEventTypes'),
    false,
    'a static inject on upstream-missing sessionEventTypes leaves the fiber PENDING forever — apply() never runs (the Tracks 404 bug)',
  )
})

function staticIncludes(list, name) {
  return Array.isArray(list) && list.includes(name)
}

test('upstream mode: mutations journal + record v2 and never touch session.append', async () => {
  const ws = await mkdtemp(join(tmpdir(), 'upstream-'))
  const tools = []
  const appended = []
  const events = []
  const session = {
    header: { id: 'session-up-1', cwd: ws },
    ownEvents: () => events,
    append: (type, data) => { appended.push({ type, data }) },
  }
  apply(fakeCtx(tools))
  const write = tools.find((t) => t.name === 'tracking_write')
  await write.execute(
    { rows: [{ id: 'u1', label: 'Upstream row', percent: 50, evidence: 'test: 1/2' }], note: 'seed' },
    { agent: { session } },
  )
  assert.deepEqual(appended, [], 'no session.append without fork admission — an unknown required event poisons the log for later reads')
  const record = JSON.parse(await readFile(join(ws, '.dsh', 'tracking', 'session-up-1.json'), 'utf8'))
  assert.equal(record.v, 2, 'the record carries the v2 journal format')
  assert.ok(Array.isArray(record.events) && record.events.length === 1, 'the mutation landed in the record journal')
  assert.equal(record.events[0].type, 'tracking/write')
  assert.equal(record.board.rows[0].percent, 50)

  // Restart continuity: a FRESH Session object (new WeakMap entry, empty own
  // events) hydrates from the v2 record — the next write continues revision.
  const session2 = {
    header: { id: 'session-up-1', cwd: ws },
    ownEvents: () => [],
    append: () => { throw new Error('must not append upstream') },
  }
  await write.execute(
    { rows: [{ id: 'u1', label: 'Upstream row', percent: 100, evidence: 'test: 2/2' }], note: 'done' },
    { agent: { session: session2 } },
  )
  const record2 = JSON.parse(await readFile(join(ws, '.dsh', 'tracking', 'session-up-1.json'), 'utf8'))
  assert.equal(record2.events.length, 2, 'hydration replayed the prior journal before the new write')
  assert.equal(record2.board.rows[0].percent, 100)
  assert.ok(record2.board.revision >= 2, 'revision continues across the restart')
  await rm(ws, { recursive: true, force: true })
})
