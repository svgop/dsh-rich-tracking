import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// The helper is module-private; evaluate it in isolation from its source.
const source = readFileSync(new URL('./host.js', import.meta.url), 'utf8')
const match = /function ownEvents\(session\) \{[\s\S]*?\n\}/.exec(source)
assert.notEqual(match, null, 'ownEvents helper found in host.js')
const seedBoundary = (session) => {
  const value = session?.header?.seedLength
  return Number.isSafeInteger(value) && value > 0 ? value : 0
}
const ownEvents = new Function('session', 'seedBoundary', `${match[0]}\nreturn ownEvents`)(null, seedBoundary)

test('prefers the Session ownEvents() method when present', () => {
  const events = [{ type: 'tracking/write', seq: 0 }]
  const session = { ownEvents: () => events }
  assert.equal(ownEvents(session), events)
})

test('a modern Session without session.events folds to the METHOD result, not empty', () => {
  // Simulates the live post-0.1.3 shape: no .events array, method present.
  const own = [{ type: 'tracking/write', seq: 2 }, { type: 'tracking/write', seq: 3 }]
  const session = { ownEvents: () => own, header: { seedLength: 2 } }
  assert.deepEqual(ownEvents(session), own)
})

test('legacy sessions keep the seed-boundary slice', () => {
  const session = { events: [{ seq: 0 }, { seq: 1 }, { seq: 2 }], header: { seedLength: 1 } }
  assert.deepEqual(ownEvents(session), [{ seq: 1 }, { seq: 2 }])
})

test('a legacy session without events degrades to an empty list', () => {
  assert.deepEqual(ownEvents({}), [])
})
