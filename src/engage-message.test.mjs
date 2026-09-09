/** engageMessage contract: the play-mode engage text is a POSITIVE decision
 * procedure (operator doctrine) — it names the SPECIFIC row to work (the
 * host-ranked lead, so an anchored agent has the choice made for it), grounds
 * itself in live in-flight state, defines waits honestly (a wait blocks a row
 * only when it blocks every slice — preparation and verification count as
 * work), and the hold exit is an EXECUTABLE tool. The wording carries no
 * prohibitions. Also pins the backoff schedule and the hold fold. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { boardView, engageDelayMs, engageMessage, foldTracking } from './tracking-engine.js'

const view = boardView(foldTracking(null, { type: 'tracking/write', data: { revision: 4, rows: [
  { id: 'w2', label: 'W2 fleet', percent: 55, status: 'active', evidence: 'x' },
  { id: 'w3', label: 'W3 deploy', percent: 20, status: 'active', evidence: 'y' },
  { id: 'w9', label: 'W9 docs', percent: 100, status: 'done', evidence: 'z' },
], note: null, git: null, commitsAhead: null, at: 1 } }))

test('engage names the host-ranked lead row and the ordered procedure', () => {
  const text = engageMessage(view, [])
  assert.match(text, /Start with "W2 fleet" \(55%, active\) — the board's own ranking/, 'the lead is the active row with the highest percent; done rows are excluded')
  assert.match(text, /1\. WORK an uncovered open row/)
  assert.match(text, /2\. INTEGRATE what landed/)
  assert.match(text, /3\. STRENGTHEN the board/)
  assert.match(text, /4\. HOLD when every open row's every slice is genuinely blocked: call tracking_hold/)
  assert.match(text, /verification, preparation, design, and scaffolding all count as work/)
  assert.match(text, /an owner's delay blocks execution while leaving your own preparation and verification as available work/)
  assert.match(text, /A wait named in an earlier hold may have landed since — check the artifact/)
})

test('all-blocked boards get the confirm-before-holding lead instead of a row', () => {
  const blocked = boardView(foldTracking(null, { type: 'tracking/write', data: { revision: 1, rows: [
    { id: 'b1', label: 'Blocked one', percent: 10, status: 'blocked', note: 'waits on owner' },
  ], note: null, git: null, commitsAhead: null, at: 1 } }))
  const text = engageMessage(blocked, [])
  assert.match(text, /confirm each blocker still stands/)
  assert.doesNotMatch(text, /Start with "/)
})

test('busy engage: live delegated work is called out as covered', () => {
  const text = engageMessage(view, [{ id: 'child-alpha-123456' }, { id: 'child-beta-123456' }])
  assert.match(text, /In flight: 2 delegated tasks/)
  assert.match(text, /their rows are covered/)
})

test('escalation: streak tiers change character — named candidates, then artifact-or-hold', () => {
  const t1 = engageMessage(view, [], 1)
  assert.match(t1, /Open and undelegated: .W2 fleet. \(55%, active\)/, 'tier 1 names the ranked candidates')
  assert.match(t1, /call tracking_hold with the named waits/)
  const t5 = engageMessage(view, [], 5)
  assert.match(t5, /hold streak 5/, 'tier 3+ names the streak count')
  assert.match(t5, /Two moves produce an artifact/)
  assert.match(t5, /A preparation or verification slice still open on any row is work/, 'unearned waits are called out by name')
})

test('the wording is purely proactive: no prohibitions anywhere', () => {
  for (const text of [engageMessage(view, []), engageMessage(view, [{ id: 'x' }]), engageMessage(view, [], 1), engageMessage(view, [], 2), engageMessage(view, [], 3), engageMessage(view, [], 9)]) {
    assert.doesNotMatch(text, /\b(do not|don't|dont|never|avoid|forbidden|lying|liar|stop)\b/i,
      'engage wording must specify what TO DO — prohibitions are the anti-pattern this design exists to replace')
  }
})

test('backoff schedule: holds coast, work resets', () => {
  assert.equal(engageDelayMs(0), 1_500, 'the first engage after productive work fires immediately')
  assert.equal(engageDelayMs(1), 60_000)
  assert.equal(engageDelayMs(2), 300_000)
  assert.equal(engageDelayMs(3), 900_000)
  assert.equal(engageDelayMs(4), 1_800_000)
  assert.equal(engageDelayMs(99), 1_800_000, 'capped at 30 minutes')
})

test('hold decision folds: playMode off, waits carried durably', () => {
  let state = foldTracking(null, { type: 'tracking/write', data: { revision: 1, rows: [
    { id: 'a', label: 'A', percent: 10, status: 'active', evidence: 'x' },
  ], note: null, git: null, commitsAhead: null, at: 1 } })
  state = foldTracking(state, { type: 'tracking/decision', data: { kind: 'play', at: 2 } })
  assert.equal(boardView(state).playMode, true)
  state = foldTracking(state, { type: 'tracking/decision', data: { kind: 'hold', rowId: null, waits: 'a waits on the operator API key', at: 3 } })
  const held = boardView(state)
  assert.equal(held.playMode, false, 'hold sleeps the loop exactly like pause')
  assert.equal(held.lastDecision.kind, 'hold')
  assert.equal(held.lastDecision.waits, 'a waits on the operator API key')
})
