/**
 * The banner at the top of the README.
 *
 * A wordmark, the one-line pitch, and the interface itself underneath —
 * rendered from the running code rather than drawn, so it cannot drift.
 *
 * Usage: node scripts/hero.mjs [out.svg]
 */

import fs from 'node:fs'
import path from 'node:path'
import { captureScreen, drawGrid, escapeXml } from './lib/terminal.mjs'

const out = process.argv[2] || 'docs/hero.svg'

const T = {
  background: '#1c1b1a',
  foreground: '#d8d4cf',
  accent: '#d97757',
  muted: '#8a8580',
  font: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
  size: 13,
  cellWidth: 7.82,
  lineHeight: 18.5,
}

const WIDTH = 1200
const PAD = 56

const screen = await captureScreen({ cols: 88, rows: 24 })

const screenWidth = screen.cols * T.cellWidth
const screenHeight = screen.rows * T.lineHeight
const headerHeight = 132
const HEIGHT = Math.round(headerHeight + screenHeight + PAD)

const screenX = (WIDTH - screenWidth) / 2
const screenY = headerHeight

const parts = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" font-family='${T.font}' font-size="${T.size}">`,
  `<rect width="${WIDTH}" height="${HEIGHT}" fill="${T.background}"/>`,

  // A hairline of accent along the top, the way the interface rules its title.
  `<rect x="0" y="0" width="${WIDTH}" height="3" fill="${T.accent}"/>`,

  `<text x="${WIDTH / 2}" y="66" text-anchor="middle" fill="${T.accent}" font-size="34" font-weight="700" letter-spacing="1">✻ Cairn</text>`,
  `<text x="${WIDTH / 2}" y="96" text-anchor="middle" fill="${T.foreground}" font-size="15">${escapeXml('Your Claude Code conversations, on every account.')}</text>`,
  `<text x="${WIDTH / 2}" y="118" text-anchor="middle" fill="${T.muted}" font-size="12.5">${escapeXml('Saved before Claude deletes them  ·  shared with every account  ·  no dependencies')}</text>`,

  ...drawGrid(screen, {
    x: screenX,
    y: screenY,
    cellWidth: T.cellWidth,
    lineHeight: T.lineHeight,
    size: T.size,
    foreground: T.foreground,
  }),

  '</svg>',
]

fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, parts.join('\n') + '\n', 'utf8')
console.log(`${out} - ${WIDTH}x${HEIGHT}`)

// The interface left stdin resumed, which holds the event loop open forever.
process.exit(0)
