/**
 * dsh-rich-tracking — engine test suite (node:test, zero deps).
 * Run: node --test src/tracking-engine.test.mjs
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { boardView, foldTracking, ledgerContext, nextCheckpointId, nextRevision, overallPercentOf, researchContext, validateBoard } from './tracking-engine.js'

const validRow = (over = {}) => ({ id: 'w2-fleet', label: 'W2 fleet rebuild', percent: 55, evidence: '.docs/GOAL.md W2 + qc: 6/11', ...over })

test('validateBoard accepts a valid board and derives status', () => {
  const check = validateBoard({ rows: [validRow(), { id: 'w3', label: 'W3', percent: 0 }], note: 'first' })
  assert.equal(check.ok, true)
  assert.equal(check.board.rows[0].status, 'active')
  assert.equal(check.board.rows[1].status, 'pending')
})

test('percent honesty: evidence required at >= 1, self-repairing message', () => {
  const check = validateBoard({ rows: [validRow({ evidence: undefined })] })
  assert.equal(check.ok, false)
  assert.match(check.errors[0], /rows\[0\]\.evidence is required when percent >= 1/)
  assert.match(check.errors[0], /paths \+ checked\/total/)
})

test('status consistency: done requires 100; 100 is done; blocked needs a note', () => {
  assert.equal(validateBoard({ rows: [validRow({ percent: 40, status: 'done' })] }).ok, false)
  assert.equal(validateBoard({ rows: [validRow({ percent: 100, evidence: 'qc: 11/11' })] }).ok, true)
  assert.equal(validateBoard({ rows: [validRow({ status: 'blocked' })] }).ok, false)
  assert.equal(validateBoard({ rows: [validRow({ percent: 30, status: 'blocked', note: 'eu02 migration blocked on DNS' })] }).ok, true)
})

test('row limits: id slug rules, duplicates, caps', () => {
  assert.equal(validateBoard({ rows: [validRow({ id: 'Bad_Id' })] }).ok, false)
  assert.equal(validateBoard({ rows: [validRow({ id: 'x'.repeat(25) })] }).ok, false)
  assert.equal(validateBoard({ rows: [validRow(), validRow({ id: 'w2-fleet' })] }).ok, false) // duplicate ids quoted
  assert.equal(validateBoard({ rows: Array.from({ length: 13 }, (_, i) => validRow({ id: `r${i}` })) }).ok, false)
})

test('fold: write replaces, resurrects dismissal; checkpoint and decisions fold', () => {
  let state = null
  state = foldTracking(state, { type: 'tracking/write', data: { revision: 1, rows: [validRow()], note: null, git: null, commitsAhead: null, at: 1 } })
  assert.equal(boardView(state).present, true)
  state = foldTracking(state, { type: 'tracking/decision', data: { kind: 'dismiss', at: 2 } })
  assert.equal(boardView(state).present, false)
  state = foldTracking(state, { type: 'tracking/write', data: { revision: 2, rows: [validRow()], note: null, git: null, commitsAhead: null, at: 3 } })
  assert.equal(boardView(state).present, true, 'a later write resurrects a dismissed board (D7)')
})

test('fold: checkpoint only records on an existing board; decision kinds record lastDecision', () => {
  let state = null
  state = foldTracking(state, { type: 'tracking/checkpoint', data: { id: 'cp-1', git: null, rows: [], at: 1 } })
  assert.equal(state, null, 'checkpoint without a board is a no-op')
  state = foldTracking(state, { type: 'tracking/write', data: { revision: 1, rows: [validRow()], note: null, git: null, commitsAhead: null, at: 2 } })
  state = foldTracking(state, { type: 'tracking/decision', data: { kind: 'pursue', rowId: 'w2-fleet', at: 3 } })
  assert.equal(boardView(state).lastDecision.kind, 'pursue')
})

test('view: dimming, dismissal filtering, since-checkpoint deltas', () => {
  let state = null
  state = foldTracking(state, { type: 'tracking/write', data: { revision: 1, rows: [validRow({ percent: 30 }), validRow({ id: 'w4', label: 'W4', percent: 0 })], note: null, git: null, commitsAhead: null, at: 1 } })
  state = foldTracking(state, { type: 'tracking/checkpoint', data: { id: 'cp-1', label: null, git: null, rows: [{ id: 'w2-fleet', label: 'W2 fleet rebuild', percent: 30, status: 'active' }, { id: 'w4', label: 'W4', percent: 0, status: 'pending' }], at: 2 } })
  state = foldTracking(state, { type: 'tracking/write', data: { revision: 2, rows: [validRow(), validRow({ id: 'w4', label: 'W4', percent: 0 }), validRow({ id: 'w9', label: 'W9 done', percent: 100, evidence: 'qc: 5/5' })], note: null, git: { branch: 'main', head: 'abc' }, commitsAhead: 2, at: 3 } })
  state = foldTracking(state, { type: 'tracking/decision', data: { kind: 'dismiss-row', rowId: 'w4', at: 4 } })
  const view = boardView(state)
  assert.equal(view.rows.length, 2, 'dismissed row filtered out')
  assert.equal(view.rows.find((row) => row.id === 'w9').dimmed, true)
  assert.equal(view.doneCount, 1)
  assert.equal(view.sinceCheckpoint.commitsAhead, 2)
  assert.equal(view.sinceCheckpoint.percentDelta > 0, true)
  assert.ok(view.sinceCheckpoint.rowDeltas.length <= 3)
})

test('turn/start never resets the board (D3 divergence from todos)', () => {
  let state = null
  state = foldTracking(state, { type: 'tracking/write', data: { revision: 1, rows: [validRow()], note: null, git: null, commitsAhead: null, at: 1 } })
  state = foldTracking(state, { type: 'turn/start', data: {} })
  assert.equal(boardView(state).present, true)
})

test('revision and checkpoint numbering scan the log backwards', () => {
  const events = [
    { type: 'tracking/write', data: { revision: 1 } },
    { type: 'tracking/checkpoint', data: { id: 'cp-1' } },
    { type: 'tracking/write', data: { revision: 7 } },
    { type: 'assistant/message', data: {} },
  ]
  assert.equal(nextRevision(events), 8)
  assert.equal(nextCheckpointId(events), 'cp-2')
  assert.equal(nextRevision([]), 1)
})

test('overall percent is the rounded mean', () => {
  assert.equal(overallPercentOf([{ percent: 55 }, { percent: 0 }]), 28)
  assert.equal(overallPercentOf([]), 0)
})

test('items: valid checklist passes through and drives percent cross-check', () => {
  const items = [
    { label: 'r1 board write', done: true },
    { label: 'marker commit', done: true },
    { label: 'r2 board write', done: true },
    { label: 'checkpoint', done: false },
    { label: 'receipt reply', done: false },
  ]
  const ok = validateBoard({ rows: [validRow({ percent: 60, evidence: 'demo receipts: 3/5', items })] })
  assert.equal(ok.ok, true)
  assert.equal(ok.board.rows[0].items.length, 5)
  assert.deepEqual(ok.board.rows[0].items[0], { label: 'r1 board write', done: true })

  const mismatch = validateBoard({ rows: [validRow({ percent: 80, evidence: 'demo receipts: 3/5', items })] })
  assert.equal(mismatch.ok, false)
  assert.match(mismatch.errors[0], /items say 3\/5 = 60/)

  const allDone = validateBoard({ rows: [validRow({ percent: 100, evidence: 'demo receipts: 5/5', items: items.map((item) => ({ ...item, done: true })) })] })
  assert.equal(allDone.ok, true)
  assert.equal(allDone.board.rows[0].status, 'done')
})

test('items: shape rules — non-empty array, boolean done, label cap, count cap', () => {
  assert.equal(validateBoard({ rows: [validRow({ items: [] })] }).ok, false)
  assert.equal(validateBoard({ rows: [validRow({ percent: 50, evidence: 'x', items: [{ label: 'a', done: true }, { label: 'b' }] })] }).ok, false)
  assert.equal(validateBoard({ rows: [validRow({ percent: 100, evidence: 'x', items: [{ label: 'x'.repeat(241), done: true }] })] }).ok, false)
  assert.equal(validateBoard({
    rows: [validRow({
      percent: 100, evidence: 'x',
      items: Array.from({ length: 21 }, () => ({ label: 'i', done: true })),
    })],
  }).ok, false)
})

test('overall percent is item-weighted when rows carry items', () => {
  const withItems = (done, total) => ({
    percent: Math.round((done / total) * 100),
    items: Array.from({ length: total }, (_, index) => ({ label: `i${index}`, done: index < done })),
  })
  assert.equal(overallPercentOf([withItems(9, 10), withItems(0, 2)]), 75, '9/12 items')
  assert.equal(overallPercentOf([withItems(3, 4), { percent: 50 }]), 70, '(3 + 0.5) / 5 units')
  assert.equal(overallPercentOf([{ percent: 55 }, { percent: 0 }]), 28, 'legacy mean unchanged without items')
})

test('view: rows carry items through to the wire', () => {
  let state = null
  state = foldTracking(state, {
    type: 'tracking/write',
    data: {
      revision: 1,
      rows: [validRow({ percent: 60, evidence: 'demo receipts: 3/5', items: [{ label: 'a', done: true }, { label: 'b', done: true }, { label: 'c', done: false }, { label: 'd', done: false }, { label: 'e', done: false }] })],
      note: null, git: null, commitsAhead: null, at: 1,
    },
  })
  const view = boardView(state)
  assert.equal(Array.isArray(view.rows[0].items), true)
  assert.equal(view.rows[0].items.filter((item) => item.done).length, 2)
  assert.equal(view.overallPercent, 40, '2/5 items = 40')
})

test('ledgerContext: null view yields the creation directive', () => {
  const text = ledgerContext(null)
  assert.match(text, /No tracking board exists yet/)
  assert.match(text, /create one now with tracking_write/)
})

test('ledgerContext: full view renders rows, item flags, evidence, and the re-derivation doctrine', () => {
  let state = null
  state = foldTracking(state, {
    type: 'tracking/write',
    data: {
      revision: 4,
      rows: [
        validRow({ percent: 60, evidence: 'demo receipts: 3/5', note: 'two receipts pending', items: [{ label: 'a', done: true }, { label: 'b', done: true }, { label: 'c', done: true }, { label: 'd', done: false }, { label: 'e', done: false }] }),
        validRow({ id: 'w9', label: 'W9 done', percent: 100, evidence: 'qc: 5/5' }),
      ],
      note: null, git: null, commitsAhead: null, at: 1,
    },
  })
  const text = ledgerContext(boardView(state))
  assert.match(text, /revision r4, overall 67%/)
  assert.match(text, /\[x\] a; \[x\] b; \[x\] c; \[ \] d/)
  assert.match(text, /— basis: demo receipts: 3\/5/)
  assert.match(text, /— note: two receipts pending/)
  assert.match(text, /W9 done \(w9\): 100% done/)
  assert.match(text, /Re-derive this ledger now/)
  assert.match(text, /update percents and item flags after every completed step/)
})

test('play mode survives whole-board writes (goal-mode continuation semantics)', () => {
  const write = (revision, percent) => ({
    type: 'tracking/write',
    data: { revision, rows: [validRow({ percent, evidence: 'x: 1/1' })], note: null, git: null, commitsAhead: null, at: revision },
  })
  let state = null
  state = foldTracking(state, write(1, 10))
  assert.equal(boardView(state).playMode, false)
  state = foldTracking(state, { type: 'tracking/decision', data: { kind: 'play', rowId: null, at: 2 } })
  assert.equal(boardView(state).playMode, true)
  // The engaged turn calls tracking_write — the loop must NOT disarm.
  state = foldTracking(state, write(2, 40))
  assert.equal(boardView(state).playMode, true, 'write must preserve playMode')
  state = foldTracking(state, write(3, 80))
  assert.equal(boardView(state).playMode, true, 'repeated writes must preserve playMode')
  // Operator-controlled stops still stop it.
  state = foldTracking(state, { type: 'tracking/decision', data: { kind: 'pause', rowId: null, at: 4 } })
  assert.equal(boardView(state).playMode, false)
  state = foldTracking(state, { type: 'tracking/decision', data: { kind: 'play', rowId: null, at: 5 } })
  assert.equal(boardView(state).playMode, true)
  state = foldTracking(state, { type: 'tracking/decision', data: { kind: 'dismiss', rowId: null, at: 6 } })
  assert.equal(boardView(state).present, false)
  assert.equal(boardView(state).playMode, false, 'dismiss disarms play mode')
})

test('play mode stops naturally at allDone', () => {
  let state = null
  state = foldTracking(state, { type: 'tracking/write', data: { revision: 1, rows: [validRow({ percent: 100, evidence: 'qc: 1/1' })], note: null, git: null, commitsAhead: null, at: 1 } })
  state = foldTracking(state, { type: 'tracking/decision', data: { kind: 'play', rowId: null, at: 2 } })
  const view = boardView(state)
  assert.equal(view.playMode, true)
  assert.equal(view.allDone, true, 'allDone boards end the engage loop host-side')
})

// ── v0.4: long-context row records (detail + sources) ───────────────────────

test('detail + sources: valid long-context row passes through to the clean board and wire', () => {
  const detail = 'Done: engine schema landed. Remains: deploy + docs. Decision: plain-directory profile deploy.'
  const check = validateBoard({ rows: [validRow({ detail, sources: ['https://example.com/competitor-a', '.docs/digest/scout.md'] })] })
  assert.equal(check.ok, true)
  assert.equal(check.board.rows[0].detail, detail)
  assert.deepEqual(check.board.rows[0].sources, ['https://example.com/competitor-a', '.docs/digest/scout.md'])
  let state = null
  state = foldTracking(state, { type: 'tracking/write', data: { revision: 1, rows: check.board.rows, note: null, git: null, commitsAhead: null, at: 1 } })
  const view = boardView(state)
  assert.equal(view.rows[0].detail, detail, 'detail rides the wire view to the dialog')
  assert.equal(view.rows[0].sources.length, 2)
})

test('detail + sources: shape rules — caps, non-empty entries, empty strings dropped', () => {
  assert.equal(validateBoard({ rows: [validRow({ detail: 'x'.repeat(4001) })] }).ok, false)
  assert.match(validateBoard({ rows: [validRow({ detail: 'x'.repeat(4001) })] }).errors[0], /rows\[0\]\.detail must be a string <= 4000/)
  assert.equal(validateBoard({ rows: [validRow({ sources: [] })] }).ok, false)
  assert.equal(validateBoard({ rows: [validRow({ sources: Array.from({ length: 13 }, () => 's') })] }).ok, false)
  assert.equal(validateBoard({ rows: [validRow({ sources: ['https://a', '   '] })] }).ok, false)
  assert.equal(validateBoard({ rows: [validRow({ sources: ['x'.repeat(301)] })] }).ok, false)
  const dropped = validateBoard({ rows: [validRow({ detail: '' })] })
  assert.equal(dropped.ok, true)
  assert.equal(dropped.board.rows[0].detail, undefined, 'empty detail drops like note/evidence')
})

test('items percent cross-check still enforced when detail/sources ride along', () => {
  const check = validateBoard({ rows: [validRow({ percent: 80, evidence: 'x: 4/5', detail: 'ctx', sources: ['s'], items: [{ label: 'a', done: true }] })] })
  assert.equal(check.ok, false)
  assert.match(check.errors[0], /items say 1\/1 = 100/)
})

test('ledgerContext: detail and sources appear as bounded presence markers', () => {
  let state = null
  state = foldTracking(state, { type: 'tracking/write', data: { revision: 1, rows: [validRow({ detail: 'd'.repeat(1200), sources: ['a', 'b'] })], note: null, git: null, commitsAhead: null, at: 1 } })
  const text = ledgerContext(boardView(state))
  assert.match(text, /— detail: 1200 chars/)
  assert.match(text, /— sources: 2/)
  assert.doesNotMatch(text, /dddd/, 'the detail TEXT stays out of the injected ledger')
})

test('refs: external references pass through, ride the wire view, and mark the ledger', () => {
  const refs = ['https://convex.dev/docs/http-endpoints', 'RFC 7231 §6.5.9 — 409 Conflict semantics', 'https://github.com/vercel/next.js/pull/72977']
  const check = validateBoard({ rows: [validRow({ refs })] })
  assert.equal(check.ok, true)
  assert.deepEqual(check.board.rows[0].refs, refs)
  let state = null
  state = foldTracking(state, { type: 'tracking/write', data: { revision: 1, rows: check.board.rows, note: null, git: null, commitsAhead: null, at: 1 } })
  const view = boardView(state)
  assert.deepEqual(view.rows[0].refs, refs, 'refs ride the wire view to the record dialog')
  assert.match(ledgerContext(view), /— refs: 3/)
})

test('refs: shape rules mirror sources — array, caps, non-empty, length', () => {
  assert.equal(validateBoard({ rows: [validRow({ refs: [] })] }).ok, false, 'empty array rejected')
  assert.match(validateBoard({ rows: [validRow({ refs: [] })] }).errors[0], /rows\[0\]\.refs must be a non-empty array/)
  assert.equal(validateBoard({ rows: [validRow({ refs: Array.from({ length: 13 }, () => 'r') })] }).ok, false, '13 refs rejected (limit 12)')
  assert.match(validateBoard({ rows: [validRow({ refs: Array.from({ length: 13 }, () => 'r') })] }).errors[0], /limit 12/)
  assert.equal(validateBoard({ rows: [validRow({ refs: ['https://a', '  '] })] }).ok, false, 'blank entry rejected')
  assert.equal(validateBoard({ rows: [validRow({ refs: ['x'.repeat(301)] })] }).ok, false, '301 chars rejected')
  assert.match(validateBoard({ rows: [validRow({ refs: ['x'.repeat(301)] })] }).errors[0], /exceeds 300 characters/)
  assert.equal(validateBoard({ rows: [validRow({ refs: 'https://a' })] }).ok, false, 'bare string rejected')
})

// ── v0.4: the scout brief (research fan-out) ────────────────────────────────

test('researchContext: ONE subagent queue — lane 1 launch prompt, remaining lanes as send_message payloads', () => {
  assert.equal(researchContext(null), null)
  let state = null
  state = foldTracking(state, {
    type: 'tracking/write',
    data: {
      revision: 3,
      rows: [
        validRow({ percent: 40, note: 'mid-flight' }),
        validRow({ id: 'w4-auth', label: 'W4 auth', percent: 10, note: 'not started', detail: 'existing detail' }),
        validRow({ id: 'w5-bill', label: 'W5 billing', percent: 0 }),
        validRow({ id: 'w9', label: 'W9 done', percent: 100, evidence: 'qc: 5/5' }),
      ],
      note: null, git: null, commitsAhead: null, at: 1,
    },
  })
  const view = boardView(state)
  const brief = researchContext(view)
  // Single-subagent shape (operator 2026-09-07): no per-row fan-out.
  assert.match(brief, /SCOUT \(tracking board r3, 3 open lane\(s\) — ONE subagent, sequential queue, NO fan-out\)/)
  assert.match(brief, /Launch ONE continuable background subagent/)
  assert.match(brief, /LANE 1 — the launch prompt/)
  assert.match(brief, /LANES 2-3 — send_message payloads/)
  assert.match(brief, /send_message \(one message per lane, in order\)/)
  // Every lane payload is self-contained: each carries the research method.
  assert.equal((brief.match(/TASK: study 3-6 competitors/g) ?? []).length, 3, 'all three lanes carry the full method')
  assert.match(brief, /LANE 1 — RESEARCH ROW "W2 fleet rebuild" \(id "w2-fleet", 40%, active\)/)
  assert.match(brief, /note: mid-flight|Latest note: mid-flight/)
  assert.match(brief, /EXTEND it, do not discard it/, 'existing detail is preserved by instruction')
  assert.match(brief, /LANE 2 — RESEARCH ROW "W4 auth"/)
  assert.match(brief, /LANE 3 — RESEARCH ROW "W5 billing"/)
  assert.doesNotMatch(brief, /W9 done/, 'done rows are not scouted')
  // Fold-back contract names all three lanes of enrichment.
  assert.match(brief, /detail \(<= 4000 chars/)
  assert.match(brief, /refs \(up to 12 EXTERNAL links/)
  assert.match(brief, /research is context, not progress/)
  assert.equal(researchContext(view, 'w9'), null, 'a done row has nothing to scout')
  const scoped = researchContext(view, 'w2-fleet')
  assert.match(scoped, /scoped to one row — ONE subagent/)
  assert.match(scoped, /LANE 1 — RESEARCH ROW "W2 fleet rebuild"/)
  assert.doesNotMatch(scoped, /W5 billing/, 'scoped scouting stays on the one row')
  assert.doesNotMatch(scoped, /send_message payloads/, 'a single lane needs no queue')
  assert.equal(researchContext(view, 'missing-row'), null, 'an absent rowId scouts nothing')
  let done = null
  done = foldTracking(done, { type: 'tracking/write', data: { revision: 1, rows: [validRow({ percent: 100, evidence: 'x: 1/1' })], note: null, git: null, commitsAhead: null, at: 1 } })
  assert.equal(researchContext(boardView(done)), null, 'an all-done board has nothing to scout')
})

test('raised limits (operator 2026-09-07): note 400, board note 400, item label 240 — and the old walls reject', () => {
  // The exact walls, one char over each new cap.
  assert.equal(validateBoard({ rows: [validRow({ note: 'n'.repeat(401) })] }).ok, false)
  assert.equal(validateBoard({ rows: [validRow({ note: 'n'.repeat(400) })] }).ok, true)
  assert.equal(validateBoard({ rows: [validRow()], note: 'b'.repeat(401) }).ok, false)
  assert.equal(validateBoard({ rows: [validRow()], note: 'b'.repeat(400) }).ok, true)
  const longItem = { label: 'l'.repeat(241), done: true }
  assert.equal(validateBoard({ rows: [validRow({ percent: 100, evidence: 'x: 1/1', items: [longItem] })] }).ok, false)
  assert.equal(validateBoard({ rows: [validRow({ percent: 100, evidence: 'x: 1/1', items: [{ label: 'l'.repeat(240), done: true }] })] }).ok, true)
  // Message text teaches the new caps.
  const check = validateBoard({ rows: [validRow({ note: 'n'.repeat(401) })] })
  assert.match(check.errors[0], /<= 400/)
})

test('checkpoint fold carries summary/expect (the prediction-verification pair)', () => {
  let state = null
  state = foldTracking(state, { type: 'tracking/write', data: { revision: 1, rows: [validRow()], note: null, git: null, commitsAhead: null, at: 1 } })
  state = foldTracking(state, {
    type: 'tracking/checkpoint',
    data: { id: 'cp-1', label: 'wave 2 pinned', summary: 'w2 fleet rebuilt and green', expect: 'w2 at 100% and qc 11/11', git: null, rows: [], at: 2 },
  })
  const cp = boardView(state).lastCheckpoint
  assert.equal(cp.summary, 'w2 fleet rebuilt and green')
  assert.equal(cp.expect, 'w2 at 100% and qc 11/11')
  // Legacy checkpoints without the pair stay null-shaped.
  state = foldTracking(state, { type: 'tracking/checkpoint', data: { id: 'cp-2', label: null, git: null, rows: [], at: 3 } })
  const legacy = boardView(state).lastCheckpoint
  assert.equal(legacy.summary, null)
  assert.equal(legacy.expect, null)
})
