// Cairn - https://github.com/veax-project/claude-cairn
// Copyright (C) 2026 veax-project. Licensed under the GNU GPL v3 or later.

/**
 * Discovery: find every account, every session index entry, and every
 * transcript currently present on this machine, then join them together.
 */

import fs from 'node:fs'
import path from 'node:path'
import {
  appDataDir,
  desktopConfigPath,
  isDir,
  projectsDir,
  readJson,
  sessionIndexRoot,
} from './paths.js'

/**
 * The account the desktop app is currently signed into.
 * Returns null when Claude Desktop has never run on this machine.
 */
export function currentAccount() {
  const config = readJson(desktopConfigPath(), null)
  if (!config) return null

  // Organisations leave a trace in config.json through per-org settings keys.
  // Collecting them gives us the full list of accounts this machine has seen,
  // even for accounts whose session folder has since been removed.
  const orgs = new Set()
  for (const key of Object.keys(config)) {
    const match = key.match(/^dxt:allowlistEnabled:([0-9a-f-]{36})$/)
    if (match) orgs.add(match[1])
  }

  return {
    accountUuid: config.lastKnownAccountUuid || null,
    knownOrgs: [...orgs],
    firstLaunchAt: config.first_launch_at || null,
  }
}

/**
 * Every `<accountUuid>/<orgUuid>` pair that has a folder on disk, with the
 * session index entries it contains.
 */
export function scanAccounts() {
  const root = sessionIndexRoot()
  const accounts = []
  if (!isDir(root)) return accounts

  for (const accountUuid of fs.readdirSync(root)) {
    const accountDir = path.join(root, accountUuid)
    if (!isDir(accountDir)) continue

    for (const orgUuid of fs.readdirSync(accountDir)) {
      const orgDir = path.join(accountDir, orgUuid)
      if (!isDir(orgDir)) continue

      const entries = []
      for (const file of fs.readdirSync(orgDir)) {
        if (!file.startsWith('local_') || !file.endsWith('.json')) continue
        const entry = readJson(path.join(orgDir, file), null)
        if (!entry || !entry.sessionId) continue
        entries.push({ ...entry, _file: path.join(orgDir, file) })
      }

      accounts.push({ accountUuid, orgUuid, dir: orgDir, entries })
    }
  }
  return accounts
}

/**
 * Every transcript on disk.
 *
 * Only `<projects>/<slug>/<id>.jsonl` counts. Deeper paths hold sub-agent and
 * workflow transcripts — machine chatter that belongs to a parent session and
 * would wildly inflate any count of "conversations".
 */
export function scanTranscripts() {
  const root = projectsDir()
  const found = new Map()
  if (!isDir(root)) return found

  for (const slug of fs.readdirSync(root)) {
    const slugDir = path.join(root, slug)
    if (!isDir(slugDir)) continue

    for (const file of fs.readdirSync(slugDir)) {
      if (!file.endsWith('.jsonl')) continue
      const full = path.join(slugDir, file)
      let stat
      try {
        stat = fs.statSync(full)
      } catch {
        continue
      }
      if (!stat.isFile()) continue

      const id = file.slice(0, -'.jsonl'.length)
      found.set(id, {
        cliSessionId: id,
        file: full,
        slug,
        size: stat.size,
        mtime: stat.mtimeMs,
      })
    }
  }
  return found
}

/**
 * Pull whatever metadata a transcript carries about itself.
 *
 * Scans from both ends: `cwd` and the first user message appear early, while
 * the auto-generated title is only written once the conversation has run for a
 * few turns, so it tends to sit further down.
 */
export function readTranscriptMeta(file, { maxLines = 1200 } = {}) {
  const meta = {
    title: null,
    cwd: null,
    firstPrompt: null,
    model: null,
    gitBranch: null,
    userMessages: 0,
    assistantMessages: 0,
    firstTimestamp: null,
    lastTimestamp: null,
  }

  let raw
  try {
    raw = fs.readFileSync(file, 'utf8')
  } catch {
    return meta
  }

  const lines = raw.split('\n')
  const budget = Math.min(lines.length, maxLines)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line || line.charCodeAt(0) !== 123 /* '{' */) continue

    // Past the scan budget we only keep counting cheap things.
    const detailed = i < budget || i > lines.length - budget

    let row
    try {
      row = JSON.parse(line)
    } catch {
      continue
    }

    if (row.type === 'user') meta.userMessages++
    else if (row.type === 'assistant') meta.assistantMessages++

    if (row.timestamp) {
      if (!meta.firstTimestamp) meta.firstTimestamp = row.timestamp
      meta.lastTimestamp = row.timestamp
    }

    if (!detailed) continue

    if (!meta.cwd && row.cwd) meta.cwd = row.cwd
    if (!meta.gitBranch && row.gitBranch) meta.gitBranch = row.gitBranch
    // Synthetic assistant rows carry `<synthetic>` rather than a model id.
    if (!meta.model && isModelId(row.message?.model)) meta.model = row.message.model

    // Titles arrive under several shapes depending on the client version.
    if (!meta.title) {
      const candidate =
        row.customTitle || row.aiTitle || (row.type === 'ai-title' || row.type === 'custom-title' ? row.title : null)
      if (candidate) meta.title = String(candidate)
    }

    if (!meta.firstPrompt && row.type === 'user') {
      const text = plainText(row.message?.content)
      if (text) meta.firstPrompt = text.slice(0, 400)
    }
  }

  return meta
}

/**
 * Flatten a message `content` field to plain text.
 * Accepts the string form and the content-block-array form, and skips blocks
 * that carry no human-readable text (tool calls, images, thinking).
 */
export function plainText(content, { includeThinking = false } = {}) {
  if (!content) return ''
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''

  const parts = []
  for (const block of content) {
    if (!block || typeof block !== 'object') continue
    if (block.type === 'text' && typeof block.text === 'string') parts.push(block.text)
    else if (includeThinking && block.type === 'thinking' && typeof block.thinking === 'string') {
      parts.push(block.thinking)
    }
  }
  return parts.join('\n').trim()
}

/**
 * True for something that looks like a real model identifier.
 *
 * Transcripts also carry placeholders such as `<synthetic>` on rows Claude
 * Code generates itself, and writing one of those into a session index entry
 * gets the entry rejected by the desktop app's validation.
 */
export function isModelId(value) {
  return typeof value === 'string' && /^claude-[a-z0-9.-]+$/i.test(value)
}

/** A readable fallback title for a session that never got one. */
export function deriveTitle(meta, cliSessionId) {
  if (meta.title) return meta.title
  if (meta.firstPrompt) {
    const oneLine = meta.firstPrompt.replace(/\s+/g, ' ').trim()
    return oneLine.length > 70 ? oneLine.slice(0, 67) + '…' : oneLine
  }
  return `Untitled session ${cliSessionId.slice(0, 8)}`
}

/**
 * Combine two sidebar entries describing the same conversation under different
 * accounts.
 *
 * Identity — which file to rewrite, and whether the conversation is visible
 * right now — comes from the entry the signed-in account owns. Everything that
 * describes the conversation comes from whichever entry knows most about it:
 * the freshest activity, and a title the user typed in preference to one the
 * app generated. A star set under any account counts as set.
 */
function mergeEntries(a, b) {
  const owner = b.visibleNow && !a.visibleNow ? b : a
  const other = owner === a ? b : a
  const fresher = (other.lastActivityAt || 0) > (owner.lastActivityAt || 0) ? other : owner

  const named =
    owner.titleSource === 'user' ? owner
    : other.titleSource === 'user' ? other
    : fresher.title ? fresher
    : owner

  const earliest = Math.min(owner.createdAt || Infinity, other.createdAt || Infinity)

  return {
    ...owner,
    title: named.title || owner.title || other.title,
    titleSource: named.titleSource,
    isStarred: owner.isStarred || other.isStarred,
    createdAt: Number.isFinite(earliest) ? earliest : null,
    lastActivityAt: Math.max(owner.lastActivityAt || 0, other.lastActivityAt || 0) || null,
    completedTurns: Math.max(owner.completedTurns || 0, other.completedTurns || 0) || null,
    transcript: owner.transcript || other.transcript,
    hasTranscript: owner.hasTranscript || other.hasTranscript,
    visibleNow: owner.visibleNow || other.visibleNow,
  }
}

/**
 * The full picture: every session known to this machine, whether it is
 * currently visible in the app, and whether its transcript still exists.
 */
export function buildInventory() {
  const accounts = scanAccounts()
  const transcripts = scanTranscripts()
  const current = currentAccount()
  const sessions = new Map()

  // Session index entries first — they carry the real titles.
  for (const account of accounts) {
    for (const entry of account.entries) {
      const id = entry.cliSessionId || entry.sessionId
      const transcript = entry.cliSessionId ? transcripts.get(entry.cliSessionId) : null
      const visibleNow = current ? account.accountUuid === current.accountUuid : false

      const candidate = {
        cliSessionId: entry.cliSessionId || null,
        sessionId: entry.sessionId,
        title: entry.title || null,
        titleSource: entry.titleSource === 'user' ? 'user' : 'auto',
        isStarred: entry.isStarred === true,
        cwd: entry.cwd || entry.originCwd || null,
        model: entry.model || null,
        createdAt: numeric(entry.createdAt),
        lastActivityAt: numeric(entry.lastActivityAt),
        completedTurns: numeric(entry.completedTurns),
        isArchived: entry.isArchived === true || entry.isArchived === 'true',
        accountUuid: account.accountUuid,
        orgUuid: account.orgUuid,
        indexFile: entry._file,
        transcript: transcript || null,
        hasTranscript: Boolean(transcript),
        visibleNow,
        source: 'index',
      }

      // After a restore the same conversation is filed under both the old
      // account and the current one. Which file to write stays the current
      // account's — otherwise the session would be reported as still hidden —
      // but the description of the conversation is merged across all of them.
      // Cairn writes the current account's entry itself, so trusting it blindly
      // makes the first backup's title and date permanent: it reads back what
      // it wrote, and rewrites it unchanged, for ever.
      sessions.set(id, sessions.has(id) ? mergeEntries(sessions.get(id), candidate) : candidate)
    }
  }

  // Then transcripts with no index entry anywhere — invisible in every account.
  for (const [id, transcript] of transcripts) {
    if (sessions.has(id)) continue
    const meta = readTranscriptMeta(transcript.file)
    sessions.set(id, {
      cliSessionId: id,
      sessionId: null,
      title: deriveTitle(meta, id),
      cwd: meta.cwd,
      model: meta.model,
      createdAt: meta.firstTimestamp ? Date.parse(meta.firstTimestamp) : transcript.mtime,
      lastActivityAt: meta.lastTimestamp ? Date.parse(meta.lastTimestamp) : transcript.mtime,
      completedTurns: meta.userMessages,
      isArchived: false,
      accountUuid: null,
      orgUuid: null,
      indexFile: null,
      transcript,
      hasTranscript: true,
      visibleNow: false,
      source: 'orphan',
      titleSource: 'auto',
      isStarred: false,
    })
  }

  return { current, accounts, sessions: [...sessions.values()], transcripts }
}

function numeric(value) {
  if (value === null || value === undefined) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}
