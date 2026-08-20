// Cairn - https://github.com/veax-project/claude-cairn
// Copyright (C) 2026 veax-project. Licensed under the GNU GPL v3 or later.

/**
 * Restore: make vaulted sessions appear in the account you are signed into now.
 *
 * Two things have to be in place for the desktop app to list a session:
 *
 *   1. the transcript at ~/.claude/projects/<slug>/<cliSessionId>.jsonl
 *   2. an index entry at <appData>/Claude/claude-code-sessions/<account>/<org>/local_*.json
 *
 * Switching accounts breaks (2) — the entries stay filed under the old account.
 * The 30-day cleanup breaks (1). Restore repairs both.
 *
 * Everything written is recorded in a restore log so `--undo` can remove
 * exactly what was added and nothing else.
 */

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { currentAccount, isModelId, scanAccounts, scanTranscripts } from './scan.js'
import { listVault, sessionDir } from './vault.js'
import {
  defaultVaultDir,
  isDir,
  projectsDir,
  readJson,
  sessionIndexRoot,
  slugForCwd,
  writeJson,
} from './paths.js'

function restoreLogPath(vault) {
  return path.join(vault, 'restore-log.json')
}

/**
 * Every index file Cairn has written, so callers can tell an account's own
 * history apart from the copies mirrored into it.
 */
export function mirroredFiles(vault = defaultVaultDir()) {
  const log = readJson(restoreLogPath(vault), { entries: [] })
  return new Set(log.entries.filter((e) => e.kind === 'index').map((e) => e.file))
}

/**
 * Build a session index entry.
 *
 * The desktop app validates these files against a strict schema before it will
 * list them — `LocalSessions.getAll` logs "fails IPC validation" and drops
 * anything that does not match. Two rules follow from that, and both were
 * learned the hard way:
 *
 *   - timestamps are numbers, not strings
 *   - no extra keys, however harmless they look
 *
 * Every field below is present in every real entry observed on disk. The two
 * genuinely optional ones (`sessionSettings`, `promptSuggestion`) are omitted.
 */
function buildIndexEntry(sessionId, cliSessionId, session) {
  const now = Date.now()
  const created = Number(session.createdAt) || now
  const active = Number(session.lastActivityAt) || created

  return {
    sessionId,
    cliSessionId,
    cwd: session.cwd || '',
    originCwd: session.cwd || '',
    lastFocusedAt: active,
    createdAt: created,
    lastActivityAt: active,
    model: isModelId(session.model) ? session.model : 'claude-opus-5',
    effort: 'high',
    isArchived: false,
    title: session.title || `Session ${cliSessionId.slice(0, 8)}`,
    titleSource: 'auto',
    // Never 'bypassPermissions': a restored session should not silently carry
    // skip-all permissions, and the app refuses that mode for sessions it did
    // not launch with the matching flag.
    permissionMode: 'auto',
    remoteMcpServersConfig: [],
    chromePermissionMode: 'skip_all_permission_checks',
    bridgeSessionIds: [],
    alwaysAllowedReasons: [],
    sessionPermissionUpdates: [],
    classifierSummaryEnabled: true,
    reportFindingsCard: true,
    spawnSeed: {},
    completedTurns: Number(session.completedTurns) || 0,
  }
}

/**
 * Pick the folder new index entries should be written to.
 *
 * Prefers a folder that already exists for the signed-in account, since that
 * is provably the one the app reads. Falls back to creating
 * `<account>/<org>` from the organisation recorded in the desktop config.
 */
export function targetFolder() {
  const current = currentAccount()
  if (!current?.accountUuid) {
    return { error: 'Claude Desktop has never signed in on this machine (no account found).' }
  }

  const root = sessionIndexRoot()
  const accountDir = path.join(root, current.accountUuid)

  if (isDir(accountDir)) {
    const orgs = fs.readdirSync(accountDir).filter((d) => isDir(path.join(accountDir, d)))
    if (orgs.length > 0) {
      // When several exist, the one holding the most entries is the live one.
      const best = orgs
        .map((org) => {
          const dir = path.join(accountDir, org)
          const count = fs.readdirSync(dir).filter((f) => f.startsWith('local_')).length
          return { org, dir, count }
        })
        .sort((a, b) => b.count - a.count)[0]
      return { accountUuid: current.accountUuid, orgUuid: best.org, dir: best.dir, existed: true }
    }
  }

  const orgUuid = current.knownOrgs[current.knownOrgs.length - 1]
  if (!orgUuid) {
    return { error: 'Could not determine the organisation for the signed-in account.' }
  }
  return {
    accountUuid: current.accountUuid,
    orgUuid,
    dir: path.join(accountDir, orgUuid),
    existed: false,
  }
}

/**
 * Which vaulted sessions are not currently listed under the signed-in account.
 */
export function findMissing(vault = defaultVaultDir()) {
  const target = targetFolder()
  if (target.error) return { error: target.error }

  const present = new Set()
  for (const account of scanAccounts()) {
    if (account.accountUuid !== target.accountUuid) continue
    for (const entry of account.entries) {
      if (entry.cliSessionId) present.add(entry.cliSessionId)
    }
  }

  const missing = listVault(vault).filter((s) => !present.has(s.cliSessionId))
  return { target, present: present.size, missing }
}

/**
 * Write the transcript and index entry for each missing session.
 *
 * `only` restricts the run to a set of session ids — that is what the
 * interactive picker passes in. `dryRun` reports without touching anything.
 */
export function restore(options = {}) {
  const vault = options.vault || defaultVaultDir()
  const dryRun = options.dryRun === true
  const found = findMissing(vault)
  if (found.error) return { error: found.error }

  const { target } = found
  const missing = options.only
    ? found.missing.filter((s) => options.only.has(s.cliSessionId))
    : found.missing
  const onDisk = scanTranscripts()
  const log = readJson(restoreLogPath(vault), { entries: [] })

  const result = {
    vault,
    target,
    dryRun,
    indexWritten: [],
    transcriptsRestored: [],
    skipped: [],
  }

  if (!dryRun) fs.mkdirSync(target.dir, { recursive: true })

  for (const session of missing) {
    const id = session.cliSessionId
    const vaultTranscript = path.join(sessionDir(vault, id), 'transcript.jsonl')

    if (!fs.existsSync(vaultTranscript)) {
      result.skipped.push({ id, title: session.title, reason: 'no transcript in vault' })
      continue
    }

    // 1. Put the transcript back if the cleanup already removed it.
    if (!onDisk.has(id)) {
      const cwd = session.cwd
      if (!cwd) {
        result.skipped.push({ id, title: session.title, reason: 'unknown working directory' })
        continue
      }
      const dest = path.join(projectsDir(), slugForCwd(cwd), `${id}.jsonl`)
      if (!dryRun) {
        fs.mkdirSync(path.dirname(dest), { recursive: true })
        fs.copyFileSync(vaultTranscript, dest)
        const stat = fs.statSync(dest)
        log.entries.push({ kind: 'transcript', file: dest, at: Date.now(), size: stat.size, mtime: stat.mtimeMs })
      }
      result.transcriptsRestored.push({ id, title: session.title, dest })
    }

    // 2. File an index entry under the signed-in account.
    const sessionId = session.sessionId || `local_${crypto.randomUUID()}`
    const file = path.join(target.dir, `${sessionId}.json`)
    const entry = buildIndexEntry(sessionId, id, session)

    if (!dryRun) {
      writeJson(file, entry)
      const stat = fs.statSync(file)
      // Size and mtime are how `undo` later tells its own file apart from one
      // Claude has since rewritten — no foreign marker inside the entry, which
      // the app's schema validation rejects.
      log.entries.push({ kind: 'index', file, at: Date.now(), size: stat.size, mtime: stat.mtimeMs })
    }
    result.indexWritten.push({ id, title: entry.title, file })
  }

  if (!dryRun && (result.indexWritten.length || result.transcriptsRestored.length)) {
    writeJson(restoreLogPath(vault), log)
  }

  return result
}

/**
 * Mirror every saved conversation into every account on this machine.
 *
 * This is what makes switching accounts stop being an event. Rather than
 * moving history to wherever you happen to be signed in, each account's folder
 * is kept as a full copy — so whichever one you sign into next already has
 * everything, including work you did on the account you just left.
 *
 * Entries are only written where they are missing, so repeated runs are cheap
 * and leave existing files untouched.
 */
export function mirror(options = {}) {
  const vault = options.vault || defaultVaultDir()
  const dryRun = options.dryRun === true
  const saved = listVault(vault).filter((s) =>
    fs.existsSync(path.join(sessionDir(vault, s.cliSessionId), 'transcript.jsonl'))
  )

  const folders = scanAccounts()

  // A freshly signed-in account has no folder until Claude creates one. Add it
  // so the very first sync after a switch still lands somewhere.
  const target = targetFolder()
  if (!target.error && !folders.some((f) => f.dir === target.dir)) {
    folders.push({ accountUuid: target.accountUuid, orgUuid: target.orgUuid, dir: target.dir, entries: [] })
  }

  const log = readJson(restoreLogPath(vault), { entries: [] })
  const onDisk = scanTranscripts()
  const result = { vault, dryRun, accounts: [], transcriptsRestored: [], written: 0 }

  // Put back any transcript the cleanup already took — once, not per account.
  for (const session of saved) {
    if (onDisk.has(session.cliSessionId) || !session.cwd) continue
    const dest = path.join(projectsDir(), slugForCwd(session.cwd), `${session.cliSessionId}.jsonl`)
    if (!dryRun) {
      fs.mkdirSync(path.dirname(dest), { recursive: true })
      fs.copyFileSync(path.join(sessionDir(vault, session.cliSessionId), 'transcript.jsonl'), dest)
      const stat = fs.statSync(dest)
      log.entries.push({ kind: 'transcript', file: dest, at: Date.now(), size: stat.size, mtime: stat.mtimeMs })
    }
    result.transcriptsRestored.push({ id: session.cliSessionId, title: session.title })
  }

  for (const folder of folders) {
    const present = new Set(folder.entries.map((e) => e.cliSessionId).filter(Boolean))
    const missing = saved.filter((s) => !present.has(s.cliSessionId))
    if (missing.length === 0) {
      result.accounts.push({ accountUuid: folder.accountUuid, added: 0, total: present.size })
      continue
    }

    if (!dryRun) fs.mkdirSync(folder.dir, { recursive: true })

    for (const session of missing) {
      const sessionId = `local_${crypto.randomUUID()}`
      const file = path.join(folder.dir, `${sessionId}.json`)
      if (!dryRun) {
        writeJson(file, buildIndexEntry(sessionId, session.cliSessionId, session))
        const stat = fs.statSync(file)
        log.entries.push({ kind: 'index', file, at: Date.now(), size: stat.size, mtime: stat.mtimeMs })
      }
      result.written++
    }

    result.accounts.push({
      accountUuid: folder.accountUuid,
      added: missing.length,
      total: present.size + missing.length,
    })
  }

  if (!dryRun && (result.written || result.transcriptsRestored.length)) {
    writeJson(restoreLogPath(vault), log)
  }
  return result
}

/**
 * Remove everything a previous restore added.
 *
 * Only files recorded in the restore log are touched, and a file whose size or
 * mtime no longer matches what was written is left alone — Claude has taken it
 * over since, and deleting it would destroy real work.
 */
export function undo(options = {}) {
  const vault = options.vault || defaultVaultDir()
  const log = readJson(restoreLogPath(vault), { entries: [] })
  const removed = []
  const kept = []

  for (const entry of log.entries) {
    let stat
    try {
      stat = fs.statSync(entry.file)
    } catch {
      continue // already gone
    }

    const untouched =
      entry.size === undefined ||
      (stat.size === entry.size && Math.abs(stat.mtimeMs - entry.mtime) < 1000)

    if (!untouched) {
      kept.push({ file: entry.file, reason: 'changed since the restore' })
      continue
    }

    try {
      fs.unlinkSync(entry.file)
      removed.push(entry.file)
    } catch (error) {
      kept.push({ file: entry.file, reason: error.message })
    }
  }

  writeJson(restoreLogPath(vault), { entries: [] })
  return { removed, kept }
}
