// Cairn - https://github.com/veax-project/claude-cairn
// Copyright (C) 2026 veax-project. Licensed under the GNU GPL v3 or later.

/**
 * Runs the real interface against a fake terminal and returns what a real
 * terminal would be showing: a grid of characters, each with its colour.
 *
 * Shared by the screenshot and the banner so both always show the code as it
 * actually is, rather than a picture someone remembered to update.
 */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const KEYS = {
  down: [undefined, { name: 'down' }],
  up: [undefined, { name: 'up' }],
  wait: [undefined, { name: 'f13' }],
}

const cell = () => ({ ch: ' ', fg: null, bold: false, dim: false })

export async function captureScreen({ cols = 92, rows = 30, keys = [], real = false } = {}) {
  process.env.COLORTERM = 'truecolor'

  const stdout = process.stdout
  const stdin = process.stdin
  const saved = { write: stdout.write, exit: process.exit, setRawMode: stdin.setRawMode }

  let captured = ''
  stdout.columns = cols
  stdout.rows = rows
  stdout.isTTY = true
  stdin.isTTY = true
  stdin.setRawMode = () => {}
  stdout.write = (chunk) => { captured += String(chunk); return true }
  process.exit = () => { throw new Error('__quit__') }

  // Never the author's own machine: a real run would put account identifiers,
  // a real name and real project paths into a public repository.
  let fixture = null
  if (!real) {
    const { buildFixture } = await import('../demo-fixture.mjs')
    fixture = buildFixture()
    Object.assign(process.env, fixture.env)
  }

  const vault = process.env.CAIRN_VAULT || fs.mkdtempSync(path.join(os.tmpdir(), 'cairn-shot-'))
  const { runTui } = await import('../../src/tui.js')
  runTui({ vault }).catch(() => {})

  for (const token of keys) {
    const [str, key] = KEYS[token] || [token, { name: token }]
    await new Promise((r) => setTimeout(r, 400))
    try { stdin.emit('keypress', str, key) } catch { break }
  }
  await new Promise((r) => setTimeout(r, 900))

  stdout.write = saved.write
  process.exit = saved.exit
  if (typeof saved.setRawMode === 'function') stdin.setRawMode = saved.setRawMode
  else delete stdin.setRawMode
  if (fixture) fs.rmSync(fixture.root, { recursive: true, force: true })

  return replay(captured, cols, rows)
}

function replay(stream, cols, rows) {
  let grid = Array.from({ length: rows }, () => Array.from({ length: cols }, cell))
  let row = 0
  let col = 0
  let style = { fg: null, bold: false, dim: false }

  const sgr = (params) => {
    const codes = params.split(';').filter((p) => p !== '')
    for (let i = 0; i < codes.length; i++) {
      const n = Number(codes[i])
      if (n === 0) style = { fg: null, bold: false, dim: false }
      else if (n === 1) style.bold = true
      else if (n === 2) style.dim = true
      else if (n === 38 && codes[i + 1] === '2') {
        style.fg = `rgb(${codes[i + 2]},${codes[i + 3]},${codes[i + 4]})`
        i += 4
      }
    }
  }

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

      if (final === 'm') sgr(params)
      else if (final === 'H') { row = 0; col = 0 }
      else if (final === 'J') {
        if (params === '2') { grid = Array.from({ length: rows }, () => Array.from({ length: cols }, cell)); row = 0; col = 0 }
        else {
          for (let c = col; c < cols; c++) grid[row][c] = cell()
          for (let r = row + 1; r < rows; r++) grid[r] = Array.from({ length: cols }, cell)
        }
      } else if (final === 'K') {
        for (let c = col; c < cols; c++) grid[row][c] = cell()
      }
      continue
    }

    if (ch === '\n') { row = Math.min(rows - 1, row + 1); col = 0; continue }
    if (ch === '\r') { col = 0; continue }
    if (row < rows && col < cols) grid[row][col] = { ch, fg: style.fg, bold: style.bold, dim: style.dim }
    col++
  }

  const used = grid.reduce((last, line, i) => (line.some((c) => c.ch !== ' ') ? i + 1 : last), 0)
  const wide = grid.slice(0, used).reduce(
    (max, line) => Math.max(max, line.reduce((l, c, i) => (c.ch !== ' ' ? i + 1 : l), 0)),
    0
  )

  return { grid, rows: used, cols: wide }
}

export const escapeXml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Draw a captured grid as SVG <text> runs, offset by (x, y). */
export function drawGrid({ grid, rows, cols }, { x = 0, y = 0, cellWidth, lineHeight, size, foreground }) {
  const parts = []
  for (let r = 0; r < rows; r++) {
    const baseline = y + r * lineHeight + size
    let c = 0
    while (c < cols) {
      const start = c
      const { fg, bold, dim } = grid[r][c]
      let text = ''
      while (c < cols && grid[r][c].fg === fg && grid[r][c].bold === bold && grid[r][c].dim === dim) {
        text += grid[r][c].ch
        c++
      }
      if (text.trim() === '') continue
      const attrs = [
        `x="${(x + start * cellWidth).toFixed(1)}"`,
        `y="${baseline.toFixed(1)}"`,
        `fill="${fg || foreground}"`,
        bold ? 'font-weight="600"' : '',
        dim ? 'opacity="0.55"' : '',
        'xml:space="preserve"',
      ].filter(Boolean)
      parts.push(`<text ${attrs.join(' ')}>${escapeXml(text)}</text>`)
    }
  }
  return parts
}
