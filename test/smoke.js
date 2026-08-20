/**
 * Smoke test against a synthetic vault, so it runs anywhere — CI included —
 * without needing Claude installed.
 */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { reindex, search, stats } from '../src/db.js'
import { listVault, readVaultTranscript, saveManifest, sessionDir } from '../src/vault.js'
import { renderPack, renderSession } from '../src/markdown.js'
import { plainText, deriveTitle } from '../src/scan.js'
import { slugForCwd } from '../src/paths.js'

const vault = fs.mkdtempSync(path.join(os.tmpdir(), 'cairn-test-'))
let passed = 0

function check(name, fn) {
  fn()
  passed++
  console.log(`  ok  ${name}`)
}

// ── fixture ─────────────────────────────────────────────────────────────────

const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
const rows = [
  { type: 'user', message: { role: 'user', content: 'how do I unlock the framerate' }, timestamp: '2026-01-01T10:00:00Z' },
  { type: 'assistant', message: { role: 'assistant', content: [{ type: 'thinking', thinking: 'internal' }, { type: 'text', text: 'Patch the multiplier at offset B6AC38.' }] }, timestamp: '2026-01-01T10:00:05Z' },
  { type: 'system', subtype: 'noise' },
  { type: 'user', message: { role: 'user', content: [{ type: 'text', text: 'thanks, that worked' }] }, timestamp: '2026-01-01T10:01:00Z' },
]

fs.mkdirSync(sessionDir(vault, id), { recursive: true })
fs.writeFileSync(
  path.join(sessionDir(vault, id), 'transcript.jsonl'),
  rows.map((r) => JSON.stringify(r)).join('\n') + '\n'
)

saveManifest(vault, {
  version: 1,
  createdAt: Date.now(),
  updatedAt: null,
  sessions: {
    [id]: {
      cliSessionId: id,
      title: 'Framerate unlock',
      cwd: 'D:\\Games\\Okami',
      model: 'claude-opus-5',
      createdAt: Date.parse('2026-01-01T10:00:00Z'),
      lastActivityAt: Date.parse('2026-01-01T10:01:00Z'),
      completedTurns: 2,
      userMessages: 2,
      assistantMessages: 1,
      bytes: 400,
    },
  },
})

// ── tests ───────────────────────────────────────────────────────────────────

console.log('\nclaude-cairn smoke test\n')

check('plainText flattens string content', () => {
  assert.equal(plainText('hello'), 'hello')
})

check('plainText flattens content blocks and skips thinking by default', () => {
  const content = [{ type: 'thinking', thinking: 'secret' }, { type: 'text', text: 'visible' }]
  assert.equal(plainText(content), 'visible')
  assert.equal(plainText(content, { includeThinking: true }), 'secret\nvisible')
})

check('plainText ignores tool blocks', () => {
  assert.equal(plainText([{ type: 'tool_use', name: 'Bash', input: {} }]), '')
})

check('slugForCwd matches the encoding Claude Code uses', () => {
  assert.equal(slugForCwd('D:\\Projets\\app'), 'D--Projets-app')
})

check('deriveTitle falls back to the first prompt', () => {
  assert.equal(deriveTitle({ title: null, firstPrompt: 'fix the build' }, id), 'fix the build')
  assert.match(deriveTitle({ title: null, firstPrompt: null }, id), /^Untitled session/)
})

check('readVaultTranscript skips malformed lines', () => {
  assert.equal(readVaultTranscript(vault, id).length, 4)
})

check('listVault reads the manifest', () => {
  const sessions = listVault(vault)
  assert.equal(sessions.length, 1)
  assert.equal(sessions[0].title, 'Framerate unlock')
})

check('reindex indexes only user and assistant prose', () => {
  const result = reindex(vault)
  assert.equal(result.sessions, 1)
  assert.equal(result.messages, 3) // the system row is not indexed
  assert.equal(stats(vault).messages, 3)
})

check('search finds a message and reports its session', () => {
  const hits = search('framerate', { vault })
  assert.ok(hits.length >= 1)
  assert.equal(hits[0].sessionId, id)
  assert.equal(hits[0].title, 'Framerate unlock')
})

check('search prefix-matches partial words', () => {
  assert.ok(search('multipl', { vault }).length >= 1)
})

check('search survives a malformed FTS expression', () => {
  assert.doesNotThrow(() => search('unbalanced " quote', { vault }))
})

check('search returns nothing for an absent term', () => {
  assert.equal(search('zzzznotpresent', { vault }).length, 0)
})

check('renderSession produces readable Markdown without thinking', () => {
  const md = renderSession(vault, listVault(vault)[0])
  assert.match(md, /# Framerate unlock/)
  assert.match(md, /### 🧑 You/)
  assert.match(md, /B6AC38/)
  assert.ok(!md.includes('internal'))
})

check('renderPack carries a preamble and a table of contents', () => {
  const md = renderPack(vault, listVault(vault))
  assert.match(md, /# Previous conversations/)
  assert.match(md, /## Contents/)
  assert.match(md, /1\. \*\*Framerate unlock\*\*/)
})

fs.rmSync(vault, { recursive: true, force: true })
console.log(`\n  ${passed} passed\n`)
