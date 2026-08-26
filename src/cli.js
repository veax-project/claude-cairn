#!/usr/bin/env node
// Cairn - https://github.com/veax-project/claude-cairn
// Copyright (C) 2026 veax-project. Licensed under the GNU GPL v3 or later.

/**
 * Cairn — command line entry point.
 *
 * Running it with no arguments opens the interactive interface, which is how
 * it is meant to be used. The named commands exist for scripting and for the
 * background backup.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { backup, listVault, vaultSize } from './vault.js'
import { findMissing, mirror, restore, undo } from './restore.js'
import { captureConnectors, connectorReport } from './connectors.js'
import { disable, enable, entryPath, isEnabled } from './autostart.js'
import { reindex, search, stats } from './db.js'
import { exportAll, renderPack } from './markdown.js'
import { startMcpServer } from './mcp.js'
import { runTui } from './tui.js'
import { buildInventory } from './scan.js'
import {
  appDataDir,
  claudeSettingsPath,
  defaultVaultDir,
  readJson,
  retentionDays,
  writeJson,
} from './paths.js'

const argv = process.argv.slice(2)
const command = argv.find((a) => !a.startsWith('-')) || ''
const flags = new Set(argv.filter((a) => a.startsWith('-')))
const vault = valueOf('--vault') || defaultVaultDir()

const truecolor = /truecolor|24bit/i.test(process.env.COLORTERM || '')
const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  accent: (s) => `${truecolor ? '\x1b[38;2;217;119;87m' : '\x1b[38;5;173m'}${s}\x1b[0m`,
  ok: (s) => `${truecolor ? '\x1b[38;2;126;196;145m' : '\x1b[38;5;114m'}${s}\x1b[0m`,
  warn: (s) => `${truecolor ? '\x1b[38;2;214;168;84m' : '\x1b[38;5;179m'}${s}\x1b[0m`,
}

// The interactive interface paints its own screen; the MCP server speaks
// JSON-RPC on stdout. Neither wants a banner.
const quiet = command === '' || command === 'mcp'
if (!quiet) {
  console.log('')
  console.log(`  ${c.accent('✻')} ${c.bold('Cairn')}`)
  console.log('')
}

switch (command) {
  case '': await runTui({ vault }); break
  case 'status': await status(); break
  case 'backup': await doBackup(); break
  case 'sync': await doSync(); break
  case 'watch': await doWatch(); break
  case 'autostart': await doAutostart(); break
  case 'restore': await doRestore(); break
  case 'undo': await doUndo(); break
  case 'connectors': await doConnectors(); break
  case 'search': await doSearch(); break
  case 'export': await doExport(); break
  case 'pack': await doPack(); break
  case 'reindex': await doReindex(); break
  case 'mcp': startMcpServer({ vault }); break
  case 'install-mcp': await doInstallMcp(); break
  case 'help': default: help()
}

// ── commands ────────────────────────────────────────────────────────────────

async function status() {
  const inventory = buildInventory()
  const retention = retentionDays()
  const saved = listVault(vault)
  const indexStats = stats(vault)

  const visible = inventory.sessions.filter((s) => s.visibleNow).length
  const elsewhere = inventory.sessions.filter((s) => !s.visibleNow && s.source === 'index')
  const orphans = inventory.sessions.filter((s) => s.source === 'orphan').length
  const accounts = new Set(inventory.accounts.map((a) => a.accountUuid)).size

  // An entry under another account whose transcript is gone cannot be brought
  // back by anything — the cleanup took it before it was ever backed up.
  const savedIds = new Set(saved.map((s) => s.cliSessionId))
  const recoverable = elsewhere.filter((s) => s.hasTranscript || savedIds.has(s.cliSessionId)).length
  const lost = elsewhere.length - recoverable

  row('Accounts on this machine', String(accounts))
  row('Visible on the current account', String(visible))
  row('Filed under other accounts', recoverable > 0 ? c.warn(String(recoverable)) : '0')
  row('No index entry anywhere', orphans > 0 ? c.warn(String(orphans)) : '0')
  if (lost > 0) {
    row('Gone before the first backup', c.warn(`${lost}  ${c.dim('transcript already deleted')}`))
  }
  console.log('')

  row(
    'Auto-delete',
    retention.explicit
      ? c.ok(`${retention.days} days (set explicitly)`)
      : c.warn(`${retention.days} days — cleanupPeriodDays is not set`)
  )
  if (!retention.explicit) console.log(`  ${c.dim(claudeSettingsPath())}`)
  console.log('')

  row('Backed up', `${saved.length} conversations · ${human(vaultSize(vault))}`)
  row('Indexed', `${indexStats.messages.toLocaleString()} messages`)
  console.log(`  ${c.dim(vault)}`)
  console.log('')

  const missing = findMissing(vault)
  if (missing.error) console.log(`  ${c.warn('!')} ${missing.error}`)
  else if (missing.missing.length > 0) {
    console.log(`  ${c.warn('!')} ${c.bold(String(missing.missing.length))} backed-up conversations are missing from this account.`)
    console.log(`    ${c.dim('run')} ${c.bold('cairn')} ${c.dim('to sync them')}`)
  } else if (saved.length > 0) console.log(`  ${c.ok('✓')} Everything backed up is visible on this account.`)
  else console.log(`  ${c.dim('→')} Nothing backed up yet. Run ${c.bold('cairn')}.`)
  console.log('')
}

async function doBackup() {
  const run = () => {
    const result = backup({ vault })
    const parts = []
    if (result.added.length) parts.push(c.ok(`+${result.added.length}`))
    if (result.updated.length) parts.push(`${result.updated.length} updated`)
    if (result.rescued.length) parts.push(c.warn(`${result.rescued.length} rescued`))
    console.log(`  ${c.dim(new Date().toTimeString().slice(0, 8))}  ${parts.join('  ') || c.dim('no change')}  ${c.dim(`${result.total} total`)}`)
    return result
  }

  const first = run()
  reindex(vault)
  console.log('')
  console.log(`  ${c.ok('✓')} ${c.bold(String(first.total))} conversations safe`)
  console.log(`    ${c.dim(vault)}`)

  console.log('')
}

/**
 * One full cycle: save everything, then make sure every account on this
 * machine lists every saved conversation.
 */
function syncOnce() {
  const saved = backup({ vault })
  reindex(vault)
  const spread = mirror({ vault })
  return { saved, spread }
}

async function doSync() {
  const { saved, spread } = syncOnce()

  console.log(`  ${c.ok('✓')} ${saved.total} conversations backed up${saved.added.length ? c.ok(`  +${saved.added.length} new`) : ''}`)
  if (spread.transcriptsRestored.length) {
    console.log(`  ${c.ok('✓')} ${spread.transcriptsRestored.length} transcripts put back on disk`)
  }
  console.log('')

  for (const account of spread.accounts) {
    const tag = account.added > 0 ? c.ok(`+${account.added}`) : c.dim('up to date')
    console.log(`  ${c.dim(account.accountUuid.slice(0, 8) + '…')}  ${String(account.total).padStart(3)} conversations   ${tag}`)
  }
  console.log('')

  if (spread.written > 0) console.log(`  ${c.bold('Restart Claude to see them.')}\n`)
  else console.log(`  ${c.ok('✓')} Every account is in sync.\n`)
}

async function doWatch() {
  const minutes = Math.max(1, Number(valueOf('--every') || 10))
  const started = new Date().toTimeString().slice(0, 8)
  console.log(`  ${c.accent('✻')} watching — every ${minutes} min, Ctrl+C to stop`)
  console.log(`    ${c.dim(vault)}`)
  console.log('')

  const cycle = () => {
    try {
      const { saved, spread } = syncOnce()
      const when = new Date().toTimeString().slice(0, 8)
      const parts = []
      if (saved.added.length) parts.push(c.ok(`+${saved.added.length} saved`))
      if (spread.written) parts.push(c.ok(`${spread.written} filed`))
      if (spread.transcriptsRestored.length) parts.push(c.warn(`${spread.transcriptsRestored.length} rescued`))
      console.log(`  ${c.dim(when)}  ${parts.join('  ') || c.dim('nothing new')}  ${c.dim(`${saved.total} total`)}`)
    } catch (error) {
      // A cycle that fails must not take the watcher down with it — Claude may
      // simply have had a file open.
      console.log(`  ${c.dim(new Date().toTimeString().slice(0, 8))}  ${c.warn('skipped: ' + error.message)}`)
    }
  }

  cycle()
  setInterval(cycle, minutes * 60_000)
  console.log(`  ${c.dim(`started ${started}`)}`)
}

async function doAutostart() {
  const wanted = argv.includes('off') ? 'off' : argv.includes('on') ? 'on' : null

  if (wanted === null) {
    console.log(`  Autostart is ${isEnabled() ? c.ok('on') : c.dim('off')}`)
    console.log(`    ${c.dim(entryPath())}`)
    console.log('')
    console.log(`  ${c.bold('cairn autostart on')}   ${c.dim('· sync in the background from now on')}`)
    console.log(`  ${c.bold('cairn autostart off')}  ${c.dim('· stop')}\n`)
    return
  }

  if (wanted === 'off') {
    const removed = disable()
    console.log(`  ${removed ? c.ok('✓') + ' Autostart removed.' : c.dim('Autostart was not on.')}\n`)
    return
  }

  const every = Math.max(1, Number(valueOf('--every') || 10))
  const file = enable({ vault, every })
  console.log(`  ${c.ok('✓')} Autostart on — syncing every ${every} min.`)
  console.log(`    ${c.dim(file)}`)
  console.log('')
  console.log(`  ${c.dim('It starts with Windows. Nothing to open, nothing to remember.')}`)
  console.log(`  ${c.dim('Turn it off with')} ${c.bold('cairn autostart off')}\n`)
}

async function doRestore() {
  const dryRun = flags.has('--dry') || flags.has('--dry-run')
  const result = restore({ vault, dryRun })

  if (result.error) return console.log(`  ${c.warn('✗')} ${result.error}\n`)

  if (!result.indexWritten.length && !result.transcriptsRestored.length) {
    return console.log(`  ${c.ok('✓')} Nothing to do.\n`)
  }

  for (const item of result.indexWritten) console.log(`  ${c.ok('+')} ${item.title}`)
  for (const item of result.skipped) console.log(`  ${c.dim('-')} ${item.title} ${c.dim(`(${item.reason})`)}`)
  console.log('')

  if (dryRun) console.log(`  ${c.warn('◆')} Dry run — nothing written. Drop ${c.bold('--dry')} to apply.\n`)
  else {
    console.log(`  ${c.ok('✓')} ${result.indexWritten.length} added to this account.`)
    if (result.transcriptsRestored.length) console.log(`  ${c.ok('✓')} ${result.transcriptsRestored.length} transcripts put back.`)
    console.log('')
    console.log(`  ${c.bold('Restart Claude to see them.')}\n`)
  }
}

async function doUndo() {
  const result = undo({ vault })
  console.log(`  ${c.ok('✓')} ${result.removed.length} file(s) removed.`)
  for (const kept of result.kept) console.log(`  ${c.dim('-')} kept ${path.basename(kept.file)} ${c.dim(`(${kept.reason})`)}`)
  console.log('')
}

/**
 * The connector checklist.
 *
 * Deliberately not called "restore": connecting a service to Claude is an
 * authorisation held on Anthropic's servers against one account, and nothing
 * on this machine could move it. What this removes is the remembering.
 */
async function doConnectors() {
  captureConnectors(vault)
  const report = connectorReport(vault)

  if (report.all.length === 0) {
    console.log(`  ${c.dim('No connectors seen yet.')}`)
    console.log(`  ${c.dim('They are recorded as you use them — run this again after a session.')}\n`)
    return
  }

  const when = (t) => (t ? new Date(t).toISOString().slice(0, 10) : '-')

  if (report.present.length) {
    console.log(`  ${c.bold('On this account')}`)
    for (const item of report.present) {
      console.log(`    ${c.ok('OK')} ${item.name.padEnd(16)} ${c.dim(`${item.tools} tools, last used ${when(item.lastUsedAt)}`)}`)
    }
    console.log('')
  }

  if (report.missing.length) {
    console.log(`  ${c.bold('You had these, this account does not')}`)
    for (const item of report.missing) {
      console.log(`    ${c.warn('--')} ${item.name.padEnd(16)} ${c.dim(`${item.tools} tools, last used ${when(item.lastUsedAt)}`)}`)
    }
    console.log('')
    console.log(`  ${c.dim('Add them back in Claude:')} ${c.bold('Settings > Connectors')}`)
    console.log('')
    console.log(`  ${c.dim('Cairn cannot reconnect them for you. Connecting a service is an')}`)
    console.log(`  ${c.dim('authorisation held on Anthropic\'s side against one account, and there')}`)
    console.log(`  ${c.dim('is no token on this computer to copy. The same service can be joined')}`)
    console.log(`  ${c.dim('to as many accounts as you like, so nothing stands in the way of it -')}`)
    console.log(`  ${c.dim('this is the list, so you do not have to remember it.')}`)
  } else {
    console.log(`  ${c.ok('OK')} This account has every connector you have used.`)
  }
  console.log('')
}

async function doSearch() {
  const query = argv.filter((a) => !a.startsWith('-') && a !== 'search').join(' ')
  if (!query) return console.log(`  ${c.warn('!')} ${c.bold('cairn search <words>')}\n`)

  const seen = new Set()
  let shown = 0
  for (const hit of search(query, { vault, limit: 40 })) {
    if (seen.has(hit.sessionId)) continue
    seen.add(hit.sessionId)
    console.log(`  ${c.bold(hit.title || 'Untitled')}  ${c.dim(new Date(Number(hit.lastActivity || 0)).toISOString().slice(0, 10))}`)
    console.log(`    ${c.dim('…' + String(hit.snippet).replace(/\s+/g, ' ').replace(/[«»]/g, '') + '…')}`)
    console.log('')
    if (++shown >= 12) break
  }
  if (!shown) console.log(`  ${c.dim('No match.')}\n`)
}

async function doExport() {
  const result = exportAll(vault, {
    outDir: valueOf('--out'),
    includeThinking: flags.has('--thinking'),
    includeTools: flags.has('--tools'),
  })
  console.log(`  ${c.ok('✓')} ${result.written.length} Markdown files`)
  console.log(`    ${c.dim(result.outDir)}\n`)
}

async function doPack() {
  const ids = argv.filter((a) => a !== 'pack' && !a.startsWith('-'))
  const all = listVault(vault)
  const chosen = ids.length ? all.filter((s) => ids.some((id) => s.cliSessionId.startsWith(id))) : all
  if (!chosen.length) return console.log(`  ${c.warn('!')} Nothing to pack.\n`)

  const out = valueOf('--out') || path.join(vault, 'claude-context-pack.md')
  fs.writeFileSync(out, renderPack(vault, chosen), 'utf8')
  console.log(`  ${c.ok('✓')} ${chosen.length} conversations — ${human(fs.statSync(out).size)}`)
  console.log(`    ${c.dim(out)}\n`)
}

async function doReindex() {
  const result = reindex(vault, {
    onProgress: (done, total) => process.stdout.write(`\r  ${done}/${total}   `),
  })
  process.stdout.write('\r')
  console.log(`  ${c.ok('✓')} ${result.sessions} conversations · ${result.messages.toLocaleString()} messages\n`)
}

/**
 * Register the MCP server with Claude Desktop.
 *
 * The config file is per machine, not per account — which is the whole point:
 * sign into a new account and the archive is already reachable.
 */
async function doInstallMcp() {
  const configFile = path.join(appDataDir(), 'claude_desktop_config.json')
  const config = readJson(configFile, {}) || {}
  config.mcpServers = config.mcpServers || {}

  // Absolute paths: the desktop app does not inherit the terminal's PATH.
  config.mcpServers['claude-cairn'] = {
    command: process.execPath,
    args: [fileURLToPath(new URL('./cli.js', import.meta.url)), 'mcp', '--vault', vault],
  }

  writeJson(configFile, config)
  console.log(`  ${c.ok('✓')} Registered as an MCP server.`)
  console.log(`    ${c.dim(configFile)}`)
  console.log('')
  console.log(`  ${c.bold('Restart Claude')}, then ask it:`)
  console.log(`    ${c.dim('"search my old conversations for the auth bug"')}\n`)
}

function help() {
  console.log(`  ${c.bold('cairn')}${' '.repeat(8)}Open the interactive interface`)
  console.log('')
  for (const [name, description] of [
    ['status', 'What is here, what is hidden, what is at risk'],
    ['autostart on', 'Sync in the background, forever  ' + c.dim('[--every 10]')],
    ['sync', 'Back up and spread to every account, once'],
    ['watch', 'Keep syncing until you stop it  ' + c.dim('[--every 10]')],
    ['backup', 'Back up only, no syncing'],
    ['restore', 'Sync to the current account only  ' + c.dim('[--dry]')],
    ['undo', 'Undo everything the syncing wrote'],
    ['connectors', 'Which connectors this account is missing'],
    ['search <words>', 'Search across every account'],
    ['install-mcp', 'Let Claude search the archive itself'],
    ['export', 'Write everything as Markdown  ' + c.dim('[--out DIR]')],
    ['pack [ids…]', 'Bundle into one file for a new chat'],
    ['reindex', 'Rebuild the search index'],
  ]) {
    console.log(`  ${c.bold(name.padEnd(16))} ${description}`)
  }
  console.log('')
  console.log(`  ${c.dim(vault)}`)
  console.log(`  ${c.dim('Override with --vault <dir> or CAIRN_VAULT.')}\n`)
}

// ── helpers ─────────────────────────────────────────────────────────────────

function valueOf(flag) {
  const i = process.argv.indexOf(flag)
  return i >= 0 ? process.argv[i + 1] : null
}

function row(label, value) {
  console.log(`  ${label.padEnd(32, ' ')} ${value}`)
}

function human(bytes) {
  if (bytes > 1e9) return (bytes / 1e9).toFixed(1) + ' GB'
  if (bytes > 1e6) return Math.round(bytes / 1e6) + ' MB'
  return Math.round(bytes / 1e3) + ' KB'
}
