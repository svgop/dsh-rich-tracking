import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readFileSync } from 'node:fs'

// The helper is module-private; evaluate it from source (same pattern as own-events.test).
const source = readFileSync(new URL('./host.js', import.meta.url), 'utf8')
const match = /function sessionLogOf\(dir\) \{[\s\S]*?\n\}/.exec(source)
assert.notEqual(match, null, 'sessionLogOf found')
const { statSync } = await import('node:fs')
const { join: j } = await import('node:path')
const sessionLogOf = new Function('statSync', 'join', `${match[0]}\nreturn sessionLogOf`)(statSync, j)

test('prefers the v2 generation when the migration wrote it beside v1', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'rt-gen1-'))
  await writeFile(join(dir, 'session.jsonl.zstd'), 'old')
  await writeFile(join(dir, 'session.v2.jsonl.zstd'), 'new')
  assert.equal(sessionLogOf(dir), 'session.v2.jsonl.zstd')
  await rm(dir, { recursive: true, force: true })
})

test('falls back to v1 when no v2 exists (pre-migration deployments)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'rt-gen2-'))
  await writeFile(join(dir, 'session.jsonl.zstd'), 'old')
  assert.equal(sessionLogOf(dir), 'session.jsonl.zstd')
  await rm(dir, { recursive: true, force: true })
})

test('v2-only session dirs (fresh post-migration writes) are found', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'rt-gen3-'))
  await writeFile(join(dir, 'session.v2.jsonl.zstd'), 'new')
  assert.equal(sessionLogOf(dir), 'session.v2.jsonl.zstd')
  await rm(dir, { recursive: true, force: true })
})

test('empty session dirs resolve to undefined', async () => {
  const dir = await mkdir(join(await mkdtemp(join(tmpdir(), 'rt-gen4-')), 'session-x'), { recursive: true })
  assert.equal(sessionLogOf(dir), undefined)
  await rm(dir, { recursive: true, force: true })
})
