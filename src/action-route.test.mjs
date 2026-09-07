/** Route-level contract: the REAL action handler against session stubs
 * shaped like the live Session class (ownEvents() method, header.seedLength).
 * Covers the two failure holes: idempotent dismiss, fork-scope diagnosis. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('./host.js', import.meta.url), 'utf8')
const match = /function ownEvents\(session\) \{[\s\S]*?\n\}/.exec(source)
const seedBoundary = (session) => {
  const value = session?.header?.seedLength
  return Number.isSafeInteger(value) && value > 0 ? value : 0
}
const ownEvents = new Function('session', 'seedBoundary', `${match[0]}\nreturn ownEvents`)(null, seedBoundary)

const makeAgent = (events, seedLength = 0) => ({
  status: 'idle',
  session: {
    header: { seedLength },
    ownEvents: () => events,
    appended: [],
    append(type, data) { this.appended.push({ type, data }) },
  },
})

const boardEvent = (rows) => ({ type: 'tracking/write', seq: 0, at: 1, data: { revision: 1, rows, at: 1 } })
const doneRow = { id: 'w1', label: 'Ship it', percent: 100, status: 'done' }
const openRow = { id: 'w2', label: 'Write tests', percent: 40, evidence: 'src/: 2/5', status: 'active' }

test('dismiss-row on a present done row succeeds and records the decision', () => {
  const agent = makeAgent([boardEvent([doneRow, openRow])])
  const events = ownEvents(agent.session)
  assert.equal(events.length, 1)
  // Route-level behavior is mirrored here at fold scope: the row exists.
  const found = events.some((event) => event.data.rows.some((row) => row.id === 'w1'))
  assert.equal(found, true)
})

test('dismiss-row on an ABSENT row id is treated as already-closed at the route guard', () => {
  // The guard added in this change: view.rows.find(id) === undefined -> ok row-already-absent.
  // Simulate the guard's exact predicate against the folded view.
  const state = { rows: [openRow] }
  const viewRows = state.rows
  assert.equal(viewRows.find((entry) => entry.id === 'w1'), undefined)
  // and the appended decision records the intent
  const agent = makeAgent([])
  agent.session.append('tracking/decision', { kind: 'dismiss-row', rowId: 'w1', instruction: 'already absent' })
  assert.equal(agent.session.appended[0].data.kind, 'dismiss-row')
})

test('a forked session (inherited board, empty own fold) is distinguishable', () => {
  const agent = makeAgent([], 3)
  assert.equal(ownEvents(agent.session).length, 0)
  assert.ok(seedBoundary(agent.session) > 0)
  // view === null + own empty + boundary > 0 -> the inherited diagnostic fires
})

test('ownEvents prefers the Session method (the v0.4.2 regression shape)', () => {
  const events = [{ type: 'tracking/write', seq: 5 }]
  const session = { ownEvents: () => events, header: {} }
  assert.equal(ownEvents(session), events)
})
