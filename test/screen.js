// Cairn - https://github.com/veax-project/claude-cairn
// Copyright (C) 2026 veax-project. Licensed under the GNU GPL v3 or later.

/**
 * Screen test.
 *
 * Fakes a terminal, drives the interface with a sequence of keypresses, then
 * replays the raw output through a small terminal emulator and inspects the
 * resulting character grid.
 *
 * This exists because the worst rendering bugs are invisible in the output
 * stream. Text left over from a previous frame is never written — it is simply
 * never erased — so it can only be caught on a grid, the way a real terminal
 * would show it.
 */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const SIZES = [
  [80, 30],
  [60, 24],
  [100, 20],
  [40, 22],
  [80, 14],
  [110, 32],
  [140, 40],
]

const KEYS = {
  down: [undefined, { name: 'down' }],
  up: [undefined, { name: 'up' }],
  q: ['q', { name: 'q' }],
  wait: [undefined, { name: 'f13' }],
}

// ── terminal emulator ───────────────────────────────────────────────────────

function replay(stream, cols, rows) {
  const blank = () => Array.from({ length: rows }, () => new Array(cols).fill(' '))
  let grid = blank()
  let row = 0
  let col = 0
  const screens = []

  const chars = Array.from(stream)
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]

    if (ch === '\x1b') {
      let j = i + 1
      if (chars[j] !== '[') { i = j; continue }
      j++
      let params = ''
      while (j < chars.length && !/[A-Za-z]/.test(chars[j])) { params += chars[j]; j++ }
      const final = chars[j]
      i = j

      if (final === 'H') {
        screens.push(grid.map((r) => r.join('').replace(/\s+$/, '')))
        row = 0
        col = 0
      } else if (final === 'J') {
        if (params === '2') { grid = blank(); row = 0; col = 0 }
        else {
          for (let c = col; c < cols; c++) grid[row][c] = ' '
          for (let r = row + 1; r < rows; r++) grid[r].fill(' ')
        }
      } else if (final === 'K') {
        for (let c = col; c < cols; c++) grid[row][c] = ' '
      }
      continue
    }

    if (ch === '\n') { row = Math.min(rows - 1, row + 1); col = 0; continue }
    if (ch === '\r') { col = 0; continue }
    if (row < rows && col < cols) grid[row][col] = ch
    col++
  }

  screens.push(grid.map((r) => r.join('').replace(/\s+$/, '')))
  return screens
}

// ── driver ──────────────────────────────────────────────────────────────────

async function drive(keys, cols, rows, vault) {
  const stdout = process.stdout
  const stdin = process.stdin
  const saved = {
    columns: stdout.columns,
    rows: stdout.rows,
    outTTY: stdout.isTTY,
    inTTY: stdin.isTTY,
    write: stdout.write,
    setRawMode: stdin.setRawMode,
    exit: process.exit,
  }

  let captured = ''
  stdout.columns = cols
  stdout.rows = rows
  stdout.isTTY = true
  stdin.isTTY = true
  stdin.setRawMode = () => {}
  stdout.write = (chunk) => { captured += String(chunk); return true }
  process.exit = () => { throw new Error('__quit__') }

  const restore = () => {
    stdout.columns = saved.columns
    stdout.rows = saved.rows
    stdout.isTTY = saved.outTTY
    stdin.isTTY = saved.inTTY
    stdout.write = saved.write
    stdin.setRawMode = saved.setRawMode
    process.exit = saved.exit
  }

  const { runTui } = await import('../src/tui.js')
  runTui({ vault }).catch(() => {})

  for (const token of keys) {
    const [str, key] = KEYS[token] || [token, { name: token }]
    await new Promise((r) => setTimeout(r, 120))
    try {
      stdin.emit('keypress', str, key)
    } catch {
      break
    }
  }
  await new Promise((r) => setTimeout(r, 200))

  restore()
  return captured
}

// ── checks ──────────────────────────────────────────────────────────────────

const NUMBERED_ROW = /^\s{2,}(❯\s)?\s*\d+\.\s/

function inspect(screens, cols, rows) {
  const problems = []
  screens.forEach((screen, s) => {
    let painted = 0
    screen.forEach((line, i) => {
      if (line.trim()) painted = i + 1
      if (line.length > cols) {
        problems.push(`screen ${s} line ${i + 1}: ${line.length} columns > ${cols}`)
      }
      // A menu row holds one short label. Anything longer means text from an
      // earlier frame was left sitting behind it.
      if (NUMBERED_ROW.test(line) && line.trim().length > 44) {
        problems.push(`screen ${s} line ${i + 1}: leftover text — "${line.trim().slice(0, 60)}"`)
      }
    })
    if (painted > rows) problems.push(`screen ${s}: ${painted} rows painted into ${rows}`)
  })
  return problems
}

// ── run ─────────────────────────────────────────────────────────────────────

console.log('\ncairn screen test\n')

const vault = fs.mkdtempSync(path.join(os.tmpdir(), 'cairn-screen-'))
let passed = 0

for (const [cols, rows] of SIZES) {
  const stream = await drive(['down', 'down', 'up', 'down', 'down', 'up', 'q'], cols, rows, vault)
  const screens = replay(stream, cols, rows).filter((s) => s.some((l) => l.trim()))

  assert.ok(screens.length > 0, `${cols}x${rows}: nothing was painted`)

  const problems = inspect(screens, cols, rows)
  assert.deepEqual(problems, [], `${cols}x${rows}:\n  ${problems.join('\n  ')}`)

  console.log(`  ok  ${String(cols).padStart(3)}x${String(rows).padEnd(3)} — ${screens.length} screens, no overflow, no leftover text`)
  passed++
}

fs.rmSync(vault, { recursive: true, force: true })
console.log(`\n  ${passed} passed\n`)
