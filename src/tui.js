/**
 * Interactive terminal interface.
 *
 * Rendering is deliberately hand-rolled: no dependency does anything here that
 * a few hundred bytes of ANSI cannot, and a tool people trust with their
 * conversation history is easier to trust with an empty dependency tree.
 */

import fs from 'node:fs'
import readline from 'node:readline'
import { buildInventory } from './scan.js'
import { backup, listVault } from './vault.js'
import { findMissing, mirror, mirroredFiles, restore } from './restore.js'
import { disable, enable, isEnabled } from './autostart.js'
import { hintFor, label, loadAccounts, setName } from './accounts.js'
import { reindex } from './db.js'
import { defaultVaultDir, retentionDays } from './paths.js'

// ── palette ─────────────────────────────────────────────────────────────────

const truecolor = /truecolor|24bit/i.test(process.env.COLORTERM || '')
const rgb = (r, g, b, fallback) =>
  truecolor ? `\x1b[38;2;${r};${g};${b}m` : `\x1b[38;5;${fallback}m`

const RESET = '\x1b[0m'
const A = rgb(217, 119, 87, 173)   // accent — warm coral
const G = rgb(126, 196, 145, 114)  // success
const Y = rgb(214, 168, 84, 179)   // warning
const D = '\x1b[2m'                // dim
const B = '\x1b[1m'                // bold

const paint = (color, text) => `${color}${text}${RESET}`
const dim = (text) => `${D}${text}${RESET}`
const bold = (text) => `${B}${text}${RESET}`
const accent = (text) => paint(A, text)

// ── screen ──────────────────────────────────────────────────────────────────

const out = process.stdout
// Floored so a one-column terminal cannot ask for a border of -1 characters,
// capped so a maximised window does not stretch prose into unreadable lines.
// One column is left free on the right: writing into the last cell makes some
// terminals wrap to the next row.
const width = () => Math.max(20, Math.min((out.columns || 80) - 1, 100))

const HIDE = '\x1b[?25l'
const SHOW = '\x1b[?25h'
const HOME = '\x1b[H'
const CLEAR_LINE = '\x1b[K'   // erase from the cursor to the end of the row
const CLEAR_BELOW = '\x1b[J'  // erase from the cursor to the end of the screen

/** How many rows a screen may use. */
function rows() {
  return Math.max(12, out.rows || 24)
}

/**
 * Paint a screen.
 *
 * Writing more lines than the terminal has scrolls it, which moves the cursor
 * origin — every later redraw then paints over the previous frame instead of
 * replacing it, and the display turns to garbage within a few keystrokes. So
 * this refuses to overflow: screens are expected to size their own content,
 * and anything still too tall is trimmed from the middle as a last resort.
 */
function frame(lines) {
  const budget = rows() - 1
  let painted = lines

  if (painted.length > budget) {
    const tail = Math.min(painted.length, Math.max(4, Math.floor(budget * 0.55)))
    const head = budget - tail - 1
    painted = [
      ...painted.slice(0, Math.max(0, head)),
      dim('  ⋯'),
      ...painted.slice(painted.length - tail),
    ]
  }

  // Every row is erased to its end before the next one starts. Overwriting is
  // not enough: a shorter line leaves the tail of the previous frame sitting
  // there, so text from the old screen shows through the new one — which is
  // exactly what a moving cursor produces, since the hint row changes place.
  out.write(HOME + painted.map((line) => line + CLEAR_LINE).join('\n') + '\n' + CLEAR_BELOW)
}

// A character is not a column. CJK and most emoji occupy two cells, combining
// marks and zero-width joiners occupy none. Counting code units instead makes
// every padded column drift and can push a line past the terminal width, which
// wraps it and breaks the absolute-cursor redraw for good.
const ZERO_WIDTH = (c) =>
  (c >= 0x0300 && c <= 0x036f) || c === 0x200d || (c >= 0xfe00 && c <= 0xfe0f)

const DOUBLE_WIDTH = (c) =>
  (c >= 0x1100 && c <= 0x115f) || (c >= 0x2e80 && c <= 0xa4cf) ||
  (c >= 0xac00 && c <= 0xd7a3) || (c >= 0xf900 && c <= 0xfaff) ||
  (c >= 0xfe30 && c <= 0xfe4f) || (c >= 0xff00 && c <= 0xff60) ||
  (c >= 0xffe0 && c <= 0xffe6) || (c >= 0x1f300 && c <= 0x1f9ff)

/** Visible width in terminal columns, ignoring ANSI escapes. */
function len(text) {
  let columns = 0
  for (const ch of String(text).replace(/\x1b\[[0-9;]*m/g, '')) {
    const c = ch.codePointAt(0)
    if (ZERO_WIDTH(c)) continue
    // Regional indicators pair up into one two-column flag.
    if (c >= 0x1f1e6 && c <= 0x1f1ff) { columns += 1; continue }
    columns += DOUBLE_WIDTH(c) ? 2 : 1
  }
  return columns
}

function pad(text, n) {
  const diff = n - len(text)
  return diff > 0 ? text + ' '.repeat(diff) : text
}

/**
 * Cut a string to `n` visible columns, appending an ellipsis when cut.
 * Escape sequences are copied through and do not count toward the width, so
 * this is safe on already-coloured text.
 */
function clip(text, n) {
  const source = String(text)
  if (len(source) <= n) return source

  // Iterate whole characters, never code units: cutting an emoji in half
  // leaves a replacement glyph that appears and vanishes as the width changes,
  // which reads as file corruption.
  const chars = Array.from(source)
  let visible = 0
  let result = ''

  for (let i = 0; i < chars.length; i++) {
    if (chars[i] === '\x1b') {
      const rest = chars.slice(i).join('')
      const end = rest.indexOf('m')
      if (end > 0) {
        result += rest.slice(0, end + 1)
        i += end
        continue
      }
    }
    const w = len(chars[i])
    if (visible + w > n - 1) break
    result += chars[i]
    visible += w
  }

  // A trailing joiner would try to fuse with the ellipsis.
  return result.replace(/‍+$/, '') + '…' + RESET
}

// Dashed rules and panels, in the house style of the Claude Code welcome
// screen: a light dotted frame with the title set into the top border.
const DASH = '┄'
const SIDE = '┊'

/** A one-line rule with the name set into it. */
function header() {
  const w = width()
  const title = ` ${accent('✻')} ${bold('Cairn')} `
  const used = len(title)
  return [accent(DASH.repeat(2)) + title + accent(DASH.repeat(Math.max(0, w - used - 2))), '']
}

/**
 * A dashed panel of a fixed inner width.
 * The title, when given, is set into the top border rather than taking a row.
 */
function panel(title, body, inner) {
  const lines = []

  if (title) {
    const label = ` ${bold(title)} `
    const fill = Math.max(0, inner - len(label))
    lines.push(accent('┌' + DASH.repeat(1)) + label + accent(DASH.repeat(fill - 1) + '┐'))
  } else {
    lines.push(accent('┌' + DASH.repeat(inner) + '┐'))
  }

  for (const row of body) {
    lines.push(accent(SIDE) + pad(' ' + clip(row, inner - 2), inner) + accent(SIDE))
  }

  lines.push(accent('└' + DASH.repeat(inner) + '┘'))
  return lines
}

/** Place two blocks side by side, padding whichever is shorter. */
function columns(left, right, leftWidth, gap = 1) {
  const height = Math.max(left.length, right.length)
  const blank = ' '.repeat(leftWidth)
  const rows = []
  for (let i = 0; i < height; i++) {
    const l = left[i] === undefined ? blank : pad(left[i], leftWidth)
    rows.push(l + ' '.repeat(gap) + (right[i] || ''))
  }
  return rows
}

// There is deliberately no ASCII mascot. Block-character art reads as clutter
// at terminal resolution; the ✻ in the title bar carries the mark on its own.

// ── input ───────────────────────────────────────────────────────────────────

// Some environments report a TTY without providing setRawMode; calling it
// blindly throws from inside an exit handler, which is the worst place for it.
const canRawMode = () => Boolean(process.stdin.isTTY) && typeof process.stdin.setRawMode === 'function'

let keyHandler = null
let inputStarted = false

function startInput() {
  // Guarded: a second listener would deliver every keypress twice, so one
  // press would move the cursor two rows and toggle two items.
  if (inputStarted) return
  inputStarted = true

  readline.emitKeypressEvents(process.stdin)
  if (canRawMode()) process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.on('keypress', (str, key) => {
    if (key?.ctrl && key.name === 'c') quit(130)
    if (keyHandler) keyHandler(str, key)
  })

  // A resize changes every width and height the screens computed with.
  process.stdout.on('resize', () => {
    if (redraw) redraw()
  })

  // Leave the terminal usable whatever happens — a hidden cursor and a raw
  // stdin outlive the process otherwise.
  const restore = () => {
    try {
      fs.writeSync(1, SHOW)
    } catch {
      /* stdout already closed */
    }
    if (canRawMode()) process.stdin.setRawMode(false)
  }
  process.on('exit', restore)
  process.on('uncaughtException', (error) => {
    restore()
    console.error('\n  ' + error.message + '\n')
    process.exit(1)
  })

  out.write(HIDE + '\x1b[2J')
}

/** Set by each screen so a resize can repaint it. */
let redraw = null

function quit(code = 0) {
  // Synchronous: on Windows a queued TTY write is dropped by process.exit,
  // which would hand the shell back without a cursor.
  try {
    fs.writeSync(1, SHOW + '\n')
  } catch {
    out.write(SHOW + '\n')
  }
  if (canRawMode()) process.stdin.setRawMode(false)
  process.exit(code)
}

/**
 * Wait for one keypress.
 *
 * Installed on the next tick on purpose. Backing up and syncing are synchronous
 * and take seconds, during which keys the user presses out of reflex queue up
 * in the terminal buffer. Installing the handler immediately would let that
 * backlog dismiss the result screen before they have read a word of it.
 */
function onKey(handler) {
  keyHandler = null
  setImmediate(() => {
    keyHandler = handler
  })
}

// ── screens ─────────────────────────────────────────────────────────────────

/** A vertical menu. Arrow keys or the number of the row. */
function menu({ title, subtitle = [], options, footer }) {
  return new Promise((resolve) => {
    let cursor = 0

    const draw = () => {
      redraw = draw
      const lines = [...header()]
      if (title) lines.push('  ' + clip(bold(title), width() - 2))
      for (const line of subtitle) lines.push('  ' + clip(line, width() - 2))
      lines.push('')

      // Only the highlighted row explains itself. Showing every hint at once
      // doubles the height of the menu and buries the choices in prose.
      options.forEach((option, i) => {
        const on = i === cursor
        const marker = on ? accent('❯') : ' '
        const number = dim(`${i + 1}.`)
        // Clipped too: an account named with a long address would wrap under
        // the next row's marker and hide which line is selected.
        const label = clip(on ? paint(A, option.label) : option.label, width() - 8)
        lines.push(`  ${marker} ${number} ${label}`)
        if (on && option.hint) lines.push(`      ${dim(clip(option.hint, width() - 8))}`)
      })

      lines.push('')
      lines.push('  ' + clip(dim(footer || '↑↓ move · 1-9 pick · enter confirm · q quit'), width() - 2))
      frame(lines)
    }

    onKey((str, key) => {
      if (key?.name === 'up' || key?.name === 'k') cursor = (cursor - 1 + options.length) % options.length
      else if (key?.name === 'down' || key?.name === 'j') cursor = (cursor + 1) % options.length
      else if (key?.name === 'return') return resolve(options[cursor])
      else if (str === 'q' || key?.name === 'escape') return resolve({ value: 'quit' })
      else if (/^[1-9]$/.test(str || '')) {
        const i = Number(str) - 1
        if (i < options.length) {
          cursor = i
          draw()
          return resolve(options[i])
        }
      }
      draw()
    })

    draw()
  })
}

/**
 * Multi-select over a long list, with a scrolling viewport.
 * Numbers select directly; space toggles; `a` toggles everything.
 */
function picker({ title, items, footer }) {
  return new Promise((resolve) => {
    const chosen = new Set()
    let cursor = 0
    let top = 0

    // Typing a row number selects it. Digits accumulate briefly so that
    // two-digit numbers work without needing a separator key.
    let typed = ''
    let typedTimer = null

    const clearTyped = () => {
      typed = ''
      clearTimeout(typedTimer)
      typedTimer = null
    }

    const commitTyped = () => {
      const n = Number(typed)
      clearTyped()
      if (n >= 1 && n <= items.length) {
        cursor = n - 1
        chosen.has(cursor) ? chosen.delete(cursor) : chosen.add(cursor)
      }
      draw()
    }

    // How many rows the list itself may use, after the header, the title, the
    // counter and the footer have taken theirs. Never zero: an empty viewport
    // would hide the cursor row and leave the screen looking frozen.
    const viewport = () => Math.max(1, Math.min(items.length, rows() - 12))

    const draw = () => {
      redraw = draw
      const visible = viewport()
      if (cursor < top) top = cursor
      if (cursor >= top + visible) top = cursor - visible + 1

      const lines = [...header()]
      lines.push('  ' + bold(title))
      lines.push('  ' + dim(`${chosen.size} of ${items.length} selected`))
      lines.push('')

      for (let i = top; i < Math.min(items.length, top + visible); i++) {
        const item = items[i]
        const on = i === cursor
        const marker = on ? accent('❯') : ' '
        const box = chosen.has(i) ? paint(G, '◉') : dim('◯')
        // Width the row numbers actually need, so the columns stay put past 99.
        const digits = String(items.length).length
        const number = dim(String(i + 1).padStart(digits, ' ') + '.')
        const meta = dim(item.meta || '')
        const room = Math.max(10, width() - len(meta) - 11 - digits)
        const label = clip(item.label, room)
        const body = pad(on ? paint(A, label) : label, room)
        lines.push(`  ${marker} ${box} ${number} ${body} ${meta}`)
      }

      if (items.length > visible && visible >= 3) {
        const shown = Math.min(items.length, top + visible)
        lines.push('  ' + dim(`   showing ${top + 1}–${shown} of ${items.length}`))
      }

      lines.push('')
      lines.push(
        '  ' +
          clip(
            typed
              ? accent(`→ ${typed}`) + dim('   keep typing, or wait')
              : dim(footer || 'type a number · space toggle · a all · n none · enter confirm · q back'),
            width() - 2
          )
      )
      frame(lines)
    }

    onKey((str, key) => {
      if (/^[0-9]$/.test(str || '')) {
        typed += str
        clearTimeout(typedTimer)
        // A number that can no longer grow into a valid row resolves at once.
        typedTimer = setTimeout(commitTyped, Number(typed) * 10 > items.length ? 0 : 700)
        return draw()
      }

      // Any other key means the half-typed number was abandoned; leaving it
      // armed makes the cursor jump on its own a moment later.
      if (typed) clearTyped()

      if (key?.name === 'up' || key?.name === 'k') cursor = Math.max(0, cursor - 1)
      else if (key?.name === 'down' || key?.name === 'j') cursor = Math.min(items.length - 1, cursor + 1)
      else if (key?.name === 'pageup') cursor = Math.max(0, cursor - viewport())
      else if (key?.name === 'pagedown') cursor = Math.min(items.length - 1, cursor + viewport())
      else if (str === ' ') chosen.has(cursor) ? chosen.delete(cursor) : chosen.add(cursor)
      else if (str === 'a') items.forEach((_, i) => chosen.add(i))
      else if (str === 'n') chosen.clear()
      else if (key?.name === 'return') {
        if (chosen.size === 0) return draw()
        return resolve([...chosen].sort((x, y) => x - y).map((i) => items[i]))
      } else if (str === 'q' || key?.name === 'escape') {
        return resolve(null)
      }
      draw()
    })

    draw()
  })
}

/** A single-line text field. Resolves with the string, or null on escape. */
function textInput({ title, subtitle = [], initial = '', placeholder = '' }) {
  return new Promise((resolve) => {
    let value = String(initial)

    const draw = () => {
      redraw = draw
      const lines = [...header(), '  ' + bold(title), '']
      for (const line of subtitle) lines.push('  ' + line)
      lines.push('')
      const shown = value || dim(placeholder)
      lines.push('  ' + accent('❯') + ' ' + shown + accent('▏'))
      lines.push('')
      lines.push('  ' + dim('enter confirm · esc cancel'))
      frame(lines)
    }

    onKey((str, key) => {
      if (key?.name === 'return') return resolve(value.trim())
      if (key?.name === 'escape') return resolve(null)
      if (key?.name === 'backspace') value = value.slice(0, -1)
      // One printable character at a time — never a pasted control sequence.
      else if (str && str.length === 1 && str >= ' ' && !key?.ctrl && !key?.meta && value.length < 60) {
        value += str
      }
      draw()
    })

    draw()
  })
}

/** A screen that just shows text and waits for a key. */
function notice({ title, lines: body, footer = 'press any key' }) {
  return new Promise((resolve) => {
    const draw = () => {
      redraw = draw
      const lines = [...header(), '  ' + bold(title), '']
      // A line wider than the terminal wraps, and a wrapped line costs a row
      // that `frame` never counted — which is how the budget gets blown.
      const room = Math.max(4, rows() - 9)
      for (const line of body.slice(0, room)) lines.push('  ' + clip(line, width() - 2))
      if (body.length > room) lines.push('  ' + dim(`… and ${body.length - room} more`))
      lines.push('')
      lines.push('  ' + clip(dim(footer), width() - 2))
      frame(lines)
    }
    draw()
    onKey(() => resolve())
  })
}

/** Render a frame with no input handler — used while work is in progress. */
function working(title, body = []) {
  keyHandler = null
  const lines = [...header(), '  ' + bold(title), '']
  for (const line of body) lines.push('  ' + clip(line, width() - 2))
  // Without this a resize mid-work repaints the *previous* screen over this one.
  redraw = () => frame(lines)
  frame(lines)
}


// ── data ────────────────────────────────────────────────────────────────────

/**
 * Everything the screens need, gathered in one pass.
 * Rebuilt on every trip round the menu so the display never goes stale.
 */
function snapshot(vault) {
  const inventory = buildInventory()
  const names = loadAccounts(vault)
  const mirrored = mirroredFiles(vault)
  const saved = listVault(vault)

  // Group by account. An account can own several organisation folders, and a
  // conversation mirrored into each would otherwise be counted twice.
  const accounts = []
  const byUuid = new Map()
  for (const folder of inventory.accounts) {
    let row = byUuid.get(folder.accountUuid)
    if (!row) {
      row = {
        uuid: folder.accountUuid,
        ids: new Set(),
        own: [],
        current: folder.accountUuid === inventory.current?.accountUuid,
      }
      byUuid.set(folder.accountUuid, row)
      accounts.push(row)
    }
    for (const entry of folder.entries) {
      row.ids.add(entry.cliSessionId || entry.sessionId)
      if (!mirrored.has(entry._file)) row.own.push(entry)
    }
  }

  for (const row of accounts) {
    row.label = label(row.uuid, names)
    row.hint = row.label.known
      ? row.label.detail
      : hintFor({ entries: row.own }, inventory.sessions, new Set())
  }

  const savedIds = new Set(saved.map((s) => s.cliSessionId))
  const elsewhere = inventory.sessions.filter((s) => !s.visibleNow && s.source === 'index')
  const missing = elsewhere.filter((s) => s.hasTranscript || savedIds.has(s.cliSessionId)).length
  const orphans = inventory.sessions.filter((s) => s.source === 'orphan').length

  return {
    inventory,
    accounts,
    saved,
    names,
    current: accounts.find((a) => a.current) || null,
    missing: missing + orphans,
    lost: elsewhere.length - missing,
    unnamed: accounts.filter((a) => !a.label.known).length,
    retention: retentionDays(),
    auto: isEnabled(),
  }
}

// ── the welcome panels ──────────────────────────────────────────────────────

const MB = (bytes) => (bytes > 1e9 ? (bytes / 1e9).toFixed(1) + ' GB' : Math.round(bytes / 1e6) + ' MB')

/**
 * The two-column welcome block.
 * Returns null when the terminal is too small for it, so the caller can fall
 * back to the plain summary rather than paint something broken.
 */
function twoPanels(state) {
  const total = width() - 4 // the menu indents its subtitle by two
  const gap = 2
  const inner = Math.floor((total - gap - 4) / 2)

  if (total < 72 || inner < 30 || rows() < 20) return null

  const who = state.current?.label.known ? state.current.label.name.split(/\s+/)[0] : null
  const bytes = state.saved.reduce((sum, s) => sum + (s.bytes || 0), 0)

  const kept = panel('Your conversations', [
    `${bold(String(state.saved.length))} kept safe${dim(` · ${MB(bytes)}`)}`,
    state.missing > 0
      ? paint(Y, `${state.missing} missing from this account`)
      : paint(G, `all of them on all ${state.accounts.length} accounts`),
    state.current?.label.known
      ? dim(`signed in as ${state.current.label.name}`)
      : dim('not signed in to Claude'),
  ], inner)

  const watch = panel('Keeping watch', [
    state.auto
      ? paint(G, '● on') + dim(' — every 10 minutes')
      : paint(Y, '○ off') + dim(' — only when you run it'),
    dim(`Claude deletes them after ${state.retention.days} days`),
    state.auto
      ? dim('Cairn copies them before that')
      : paint(Y, 'nothing is protecting them'),
  ], inner)

  return [
    who ? bold(`Welcome back ${who}.`) : bold('Your conversations'),
    '',
    ...columns(kept, watch, inner + 2, gap),
  ]
}

/** The plain version, for terminals too small to hold the panels. */
function compactSummary(state) {
  return [
    state.current?.label.known
      ? 'Signed in as  ' + bold(state.current.label.name)
      : dim('Not signed in to Claude.'),
    dim(`${state.accounts.length} accounts · ${state.saved.length} conversations kept safe`),
    '',
    state.missing > 0
      ? paint(Y, `⚠ ${state.missing} conversation${state.missing === 1 ? '' : 's'} missing from this account.`)
      : paint(G, '✓ Every account has every conversation.'),
    state.auto
      ? paint(G, '● Automatic sync on') + dim(' — every 10 min, starting with your computer.')
      : paint(Y, '○ Automatic sync off') + dim(` — Claude deletes conversations after ${state.retention.days} days.`),
  ]
}

// ── account screen ──────────────────────────────────────────────────────────

/**
 * The account list, and the place to put names on the ones from before Cairn
 * existed. Kept off the main screen: it is reference material, not a decision.
 */
async function accountsScreen(vault) {
  while (true) {
    const state = snapshot(vault)

    const options = state.accounts.map((row) => ({
      value: row.uuid,
      label:
        (row.label.known ? row.label.name : dim(row.label.name)) +
        (row.current ? paint(G, '   ← signed in now') : ''),
      hint: row.hint || dim('nothing of its own left'),
    }))
    options.push({ value: 'back', label: 'Back', hint: '' })

    const picked = await menu({
      title: 'Accounts',
      subtitle: [
        dim(state.accounts.length + ' on this machine · each holds all ' + state.saved.length + ' conversations'),
        state.unnamed > 0
          ? dim('Accounts you sign into from now on name themselves. Pick one to name it.')
          : '',
      ].filter(Boolean),
      options,
      footer: '↑↓ move · 1-9 pick · enter name it · q back',
    })

    if (!picked || picked.value === 'back' || picked.value === 'quit') return

    const existing = state.names.accounts?.[picked.value]
    const typed = await textInput({
      title: 'Name this account',
      subtitle: [dim(picked.value), existing?.email ? dim(existing.email) : ''].filter(Boolean),
      initial: existing?.customName || '',
      placeholder: 'work, personal, old gmail…',
    })
    if (typed !== null) setName(vault, picked.value, typed)
  }
}

// ── flow ────────────────────────────────────────────────────────────────────

export async function runTui({ vault = defaultVaultDir() } = {}) {
  // Piped or redirected: there is no way to drive a full-screen interface, and
  // painting one into a log file helps nobody.
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.log('  ' + A + '✻' + RESET + ' ' + B + 'Cairn' + RESET)
    console.log('')
    console.log('  This screen needs an interactive terminal.')
    console.log('  Try `cairn status`, `cairn sync` or `cairn autostart on`.')
    console.log('')
    process.exit(1)
  }

  startInput()
  working('Looking at your machine…')

  while (true) {
    const state = snapshot(vault)

    const summary = twoPanels(state) || compactSummary(state)

    const choice = await menu({
      title: '',
      subtitle: summary,
      options: [
        { value: 'sync', label: 'Sync now', hint: 'give every account every conversation, in both directions' },
        { value: 'pick', label: 'Choose which ones', hint: 'pick conversations by number, for this account only' },
        {
          value: 'auto',
          label: state.auto ? 'Turn automatic sync off' : 'Turn automatic sync on',
          hint: state.auto
            ? 'stop the background sync'
            : 'sync every 10 minutes from now on — and never think about this again',
        },
        {
          value: 'accounts',
          label: 'Accounts',
          // Never open a hint with a bare number — next to a numbered menu it
          // reads as a stray digit rather than a count.
          hint: state.unnamed > 0
            ? `put a name on the ${state.unnamed} accounts still shown as a code`
            : 'see and rename your accounts',
        },
        { value: 'quit', label: 'Quit', hint: '' },
      ],
    })

    if (choice.value === 'quit') quit(0)

    if (choice.value === 'accounts') {
      await accountsScreen(vault)
      continue
    }

    if (choice.value === 'auto') {
      if (state.auto) {
        disable()
        await notice({
          title: 'Automatic sync off',
          lines: [
            'Nothing runs in the background any more.',
            '',
            dim('Your backups are untouched — but new conversations are on their own again.'),
          ],
          footer: 'press any key to go back',
        })
      } else {
        enable({ vault, every: 10 })
        await notice({
          title: 'Automatic sync on',
          lines: [
            paint(G, 'Every 10 minutes, starting with your computer:'),
            '',
            '  · every conversation is copied somewhere Claude cannot delete it',
            '  · every account is given every conversation',
            '',
            dim('Switch accounts, restart Claude, and your history is already there.'),
          ],
          footer: 'press any key to go back',
        })
      }
      continue
    }

    // Both remaining actions save first — nothing is worth syncing that is not
    // already safe.
    working('Backing up…', [dim('copying everything out of reach of the 30-day cleanup')])
    backup({ vault })
    reindex(vault)

    if (choice.value === 'sync') {
      working('Syncing every account…')
      const spread = mirror({ vault })
      const lines = spread.accounts.map((account) => {
        const row = state.accounts.find((a) => a.uuid === account.accountUuid)
        const who = row?.label.known ? row.label.name : account.accountUuid.slice(0, 8) + '…'
        const tag = account.added > 0 ? paint(G, '+' + account.added) : dim('up to date')
        return pad(who, 26) + pad(account.total + ' conversations', 20) + tag
      })
      lines.push('')
      lines.push(
        spread.written > 0
          ? bold('Restart Claude to see them.')
          : paint(G, 'Every account already had everything.')
      )
      await notice({ title: 'Done', lines, footer: 'press any key to go back' })
      continue
    }

    // choice.value === 'pick'
    const found = findMissing(vault)
    if (found.error) {
      await notice({ title: 'Cannot continue', lines: [paint(Y, found.error)] })
      continue
    }
    if (found.missing.length === 0) {
      await notice({
        title: 'Nothing to add',
        lines: [paint(G, 'This account already lists every conversation.')],
        footer: 'press any key to go back',
      })
      continue
    }

    const items = found.missing.map((session) => ({
      label: session.title || 'Untitled',
      meta: session.lastActivityAt ? new Date(session.lastActivityAt).toISOString().slice(0, 10) : '',
      session,
    }))
    const chosen = await picker({ title: 'Which conversations do you want on this account?', items })
    if (!chosen || chosen.length === 0) continue

    working('Adding…', [dim(chosen.length + ' conversation' + (chosen.length === 1 ? '' : 's'))])
    const applied = restore({ vault, only: new Set(chosen.map((c) => c.session.cliSessionId)) })

    const done = [paint(G, applied.indexWritten.length + ' added to this account.')]
    if (applied.transcriptsRestored.length) {
      done.push(paint(G, applied.transcriptsRestored.length + ' put back on disk.'))
    }
    done.push('')
    done.push(bold('Restart Claude to see them.'))
    await notice({ title: 'Done', lines: done, footer: 'press any key to go back' })
  }
}
