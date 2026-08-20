/**
 * Renders the interface to an SVG, for the README.
 *
 * Runs the real interface against a fake terminal, replays the output onto a
 * character grid keeping each cell's colour, then draws that grid as SVG.
 * The result is a screenshot that is text under the hood: diffable, tiny, and
 * always in step with the code.
 *
 * Usage: node scripts/screenshot.mjs <out.svg> [keys] [cols] [rows]
 *   node scripts/screenshot.mjs docs/home.svg "" 92 20
 *   node scripts/screenshot.mjs docs/accounts.svg "4" 92 20
 */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const [outFile = 'docs/home.svg', keysArg = '', colsArg = '92', rowsArg = '30'] = process.argv.slice(2)
const COLS = Number(colsArg)
const ROWS = Number(rowsArg)
const KEY_SEQUENCE = keysArg ? keysArg.split(',').filter(Boolean) : []

const THEME = {
  background: '#1c1b1a',
  foreground: '#d8d4cf',
  font: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
  size: 14,
  cellWidth: 8.42,
  lineHeight: 20,
  padding: 22,
  radius: 10,
}

const KEYS = {
  down: [undefined, { name: 'down' }],
  up: [undefined, { name: 'up' }],
  wait: [undefined, { name: 'f13' }],
}

// ── drive the real interface ────────────────────────────────────────────────

process.env.COLORTERM = 'truecolor'

const stdout = process.stdout
const stdin = process.stdin
const saved = { write: stdout.write, exit: process.exit, setRawMode: stdin.setRawMode }

let captured = ''
stdout.columns = COLS
stdout.rows = ROWS
stdout.isTTY = true
stdin.isTTY = true
stdin.setRawMode = () => {}
stdout.write = (chunk) => { captured += String(chunk); return true }
process.exit = () => { throw new Error('__quit__') }

// Screenshots are taken against invented data, never the author's machine:
// a real run would put account identifiers, a real name and real project paths
// into a public repository. Pass --real to shoot the live install instead.
const useReal = process.argv.includes('--real')
let fixture = null

if (!useReal) {
  const { buildFixture } = await import('./demo-fixture.mjs')
  fixture = buildFixture()
  Object.assign(process.env, fixture.env)
}

const vault = process.env.CAIRN_VAULT || fs.mkdtempSync(path.join(os.tmpdir(), 'cairn-shot-'))
const { runTui } = await import('../src/tui.js')
runTui({ vault }).catch(() => {})

for (const token of KEY_SEQUENCE) {
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

// ── replay onto a coloured grid ─────────────────────────────────────────────

const cell = () => ({ ch: ' ', fg: null, bold: false, dim: false })
let grid = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, cell))
let row = 0
let col = 0
let style = { fg: null, bold: false, dim: false }

function sgr(params) {
  const codes = params.split(';').filter((p) => p !== '')
  for (let i = 0; i < codes.length; i++) {
    const n = Number(codes[i])
    if (n === 0) style = { fg: null, bold: false, dim: false }
    else if (n === 1) style.bold = true
    else if (n === 2) style.dim = true
    else if (n === 38) {
      if (codes[i + 1] === '2') {
        style.fg = `rgb(${codes[i + 2]},${codes[i + 3]},${codes[i + 4]})`
        i += 4
      } else if (codes[i + 1] === '5') {
        style.fg = null // 256-colour fallback is never emitted with COLORTERM set
        i += 2
      }
    }
  }
}

const chars = Array.from(captured)
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
      if (params === '2') { grid = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, cell)); row = 0; col = 0 }
      else {
        for (let c = col; c < COLS; c++) grid[row][c] = cell()
        for (let r = row + 1; r < ROWS; r++) grid[r] = Array.from({ length: COLS }, cell)
      }
    } else if (final === 'K') {
      for (let c = col; c < COLS; c++) grid[row][c] = cell()
    }
    continue
  }

  if (ch === '\n') { row = Math.min(ROWS - 1, row + 1); col = 0; continue }
  if (ch === '\r') { col = 0; continue }
  if (row < ROWS && col < COLS) grid[row][col] = { ch, fg: style.fg, bold: style.bold, dim: style.dim }
  col++
}

// ── draw ────────────────────────────────────────────────────────────────────

const used = grid.reduce((last, line, i) => (line.some((c) => c.ch !== ' ') ? i + 1 : last), 0)
const wide = grid.slice(0, used).reduce(
  (max, line) => Math.max(max, line.reduce((l, c, i) => (c.ch !== ' ' ? i + 1 : l), 0)),
  0
)

const W = Math.round(wide * THEME.cellWidth + THEME.padding * 2)
const H = Math.round(used * THEME.lineHeight + THEME.padding * 2)

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const parts = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family='${THEME.font}' font-size="${THEME.size}">`,
  `<rect width="${W}" height="${H}" rx="${THEME.radius}" fill="${THEME.background}"/>`,
]

for (let r = 0; r < used; r++) {
  const y = THEME.padding + r * THEME.lineHeight + THEME.size
  let c = 0
  while (c < wide) {
    const start = c
    const { fg, bold, dim } = grid[r][c]
    let text = ''
    while (
      c < wide &&
      grid[r][c].fg === fg &&
      grid[r][c].bold === bold &&
      grid[r][c].dim === dim
    ) {
      text += grid[r][c].ch
      c++
    }
    if (text.trim() === '') continue
    const x = (THEME.padding + start * THEME.cellWidth).toFixed(1)
    const attrs = [
      `x="${x}"`,
      `y="${y}"`,
      `fill="${fg || THEME.foreground}"`,
      bold ? 'font-weight="600"' : '',
      dim ? 'opacity="0.55"' : '',
      'xml:space="preserve"',
    ].filter(Boolean)
    parts.push(`<text ${attrs.join(' ')}>${escape(text)}</text>`)
  }
}

parts.push('</svg>')

fs.mkdirSync(path.dirname(outFile), { recursive: true })
fs.writeFileSync(outFile, parts.join('\n') + '\n', 'utf8')
console.log(`${outFile} — ${W}x${H}, ${used} rows`)

// The interface left stdin resumed, which holds the event loop open forever.
process.exit(0)
