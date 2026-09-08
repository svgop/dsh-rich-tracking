/** engageMessage contract: the play-mode engage text is a POSITIVE decision
 * procedure (operator doctrine 2026-09-07) — it names what to do in order,
 * grounds itself in what is actually in flight, and pause is EARNED by
 * naming each row's wait. The wording carries no prohibitions: idleness has
 * nothing to fill because the next move is always specified. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { boardView, engageMessage, foldTracking } from './tracking-engine.js'

const view = boardView(foldTracking(null, { type: 'tracking/write', data: { revision: 4, rows: [
  { id: 'w2', label: 'W2 fleet', percent: 55, status: 'active', evidence: 'x' },
  { id: 'w3', label: 'W3 deploy', percent: 20, status: 'active', evidence: 'y' },
], note: null, git: null, commitsAhead: null, at: 1 } }))

test('idle engage: ordered procedure, board summary, pause gate', () => {
  const text = engageMessage(view, [])
  assert.match(text, /\[rich-tracking \| engage\] Play mode/)
  assert.match(text, /r4, /)
  assert.match(text, /W2 fleet 55%/)
  assert.match(text, /1\. TAKE an uncovered open row/)
  assert.match(text, /2\. INTEGRATE what landed/)
  assert.match(text, /3\. STRENGTHEN the board/)
  assert.match(text, /Pausing is earned by naming the waits/)
  assert.match(text, /waits on the deploy subagent/, 'names the shape of a valid pause')
  assert.doesNotMatch(text, /In flight:/, 'no in-flight line when nothing runs')
})

test('busy engage: live delegated work is called out as covered', () => {
  const text = engageMessage(view, [{ id: 'child-alpha-123456' }, { id: 'child-beta-123456' }])
  assert.match(text, /In flight: 2 delegated tasks/)
  assert.match(text, /their rows are covered/)
  assert.match(text, /child-alpha-1/, 'child ids are shortened for the line')
})

test('the wording is purely proactive: no prohibitions anywhere', () => {
  for (const text of [engageMessage(view, []), engageMessage(view, [{ id: 'x' }])]) {
    assert.doesNotMatch(text, /\b(do not|don't|dont|never|avoid|forbidden|lying|liar|stop)\b/i,
      'engage wording must specify what TO DO — prohibitions are the anti-pattern this design exists to replace')
  }
})
