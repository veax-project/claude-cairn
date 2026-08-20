/**
 * Renders the interface to an SVG, for the README.
 *
 * The result is a screenshot that is text under the hood: diffable, a few
 * kilobytes, and always in step with the code that produced it.
 *
 * Usage: node scripts/screenshot.mjs <out.svg> [keys] [cols] [rows] [--real]
 *   node scripts/screenshot.mjs docs/home.svg "" 92 30
 *   node scripts/screenshot.mjs docs/accounts.svg "4,wait" 92 30
 */

import fs from 'node:fs'
import path from 'node:path'
import { captureScreen, drawGrid } from './lib/terminal.mjs'

const [outFile = 'docs/home.svg', keysArg = '', colsArg = '92', rowsArg = '30'] = process.argv
  .slice(2)
  .filter((a) => !a.startsWith('--'))

const T = {
  background: '#1c1b1a',
  foreground: '#d8d4cf',
  font: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
  size: 14,
  cellWidth: 8.42,
  lineHeight: 20,
  padding: 22,
  radius: 10,
}

const screen = await captureScreen({
  cols: Number(colsArg),
  rows: Number(rowsArg),
  keys: keysArg ? keysArg.split(',').filter(Boolean) : [],
  real: process.argv.includes('--real'),
})

const W = Math.round(screen.cols * T.cellWidth + T.padding * 2)
const H = Math.round(screen.rows * T.lineHeight + T.padding * 2)

const parts = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family='${T.font}' font-size="${T.size}">`,
  `<rect width="${W}" height="${H}" rx="${T.radius}" fill="${T.background}"/>`,
  ...drawGrid(screen, {
    x: T.padding,
    y: T.padding,
    cellWidth: T.cellWidth,
    lineHeight: T.lineHeight,
    size: T.size,
    foreground: T.foreground,
  }),
  '</svg>',
]

fs.mkdirSync(path.dirname(outFile), { recursive: true })
fs.writeFileSync(outFile, parts.join('\n') + '\n', 'utf8')
console.log(`${outFile} - ${W}x${H}, ${screen.rows} rows`)

// The interface left stdin resumed, which holds the event loop open forever.
process.exit(0)
