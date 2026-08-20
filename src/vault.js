// Cairn - https://github.com/veax-project/claude-cairn
// Copyright (C) 2026 veax-project. Licensed under the GNU GPL v3 or later.

/**
 * The vault: a copy of every session that lives outside ~/.claude, and
 * therefore outside the reach of Claude Code's garbage collector.
 *
 * Layout:
 *   <vault>/manifest.json                    every session ever seen
 *   <vault>/sessions/<id>/meta.json          merged metadata
 *   <vault>/sessions/<id>/transcript.jsonl   the conversation itself
 *   <vault>/index.db                         full-text search index
 */

import fs from 'node:fs'
import path from 'node:path'
import { buildInventory, deriveTitle, readTranscriptMeta } from './scan.js'
import { captureIdentity } from './accounts.js'
import { defaultVaultDir, readJson, writeJson } from './paths.js'

const MANIFEST_VERSION = 1

export function manifestPath(vault) {
  return path.join(vault, 'manifest.json')
}

export function sessionDir(vault, cliSessionId) {
  return path.join(vault, 'sessions', cliSessionId)
}

export function loadManifest(vault) {
  const manifest = readJson(manifestPath(vault), null)
  if (!manifest || manifest.version !== MANIFEST_VERSION) {
    return { version: MANIFEST_VERSION, createdAt: Date.now(), updatedAt: null, sessions: {} }
  }
  return manifest
}

export function saveManifest(vault, manifest) {
  manifest.updatedAt = Date.now()
  writeJson(manifestPath(vault), manifest)
}

/**
 * Copy everything currently on disk into the vault.
 *
 * Transcripts are append-only, so a file whose size has not changed since the
 * last run is skipped. A file that has grown is re-copied in full — cheap
 * enough at these sizes, and immune to torn writes from a live session.
 *
 * Nothing is ever deleted from the vault. A session that Claude Code has
 * already purged stays in the manifest, flagged `goneFromDisk`, because that
 * copy is now the only one in existence.
 */
export function backup(options = {}) {
  const vault = options.vault || defaultVaultDir()
  const inventory = buildInventory()
  const manifest = loadManifest(vault)

  // Note who is signed in. Nothing else on this machine records it, so the
  // only chance to learn an account's name is while it is in use.
  captureIdentity(vault)

  fs.mkdirSync(path.join(vault, 'sessions'), { recursive: true })

  const result = {
    vault,
    added: [],
    updated: [],
    unchanged: [],
    rescued: [],
    skipped: [],
    goneFromDisk: [],
  }

  for (const session of inventory.sessions) {
    const id = session.cliSessionId
    if (!id) {
      result.skipped.push({ reason: 'no transcript id', title: session.title })
      continue
    }

    if (!session.hasTranscript) {
      // The app still lists it, but Claude Code has already deleted the
      // transcript. Nothing left to copy — record the loss unless we saved it
      // on an earlier run.
      const saved = manifest.sessions[id]
      if (saved) {
        saved.goneFromDisk = true
        result.rescued.push({ id, title: saved.title })
      } else {
        result.goneFromDisk.push({ id, title: session.title })
      }
      continue
    }

    const dir = sessionDir(vault, id)
    const target = path.join(dir, 'transcript.jsonl')
    const previous = manifest.sessions[id]
    const size = session.transcript.size

    let targetSize = -1
    try {
      targetSize = fs.statSync(target).size
    } catch {
      /* not copied yet */
    }

    const isNew = targetSize < 0
    const grew = !isNew && size > targetSize
    const needsCopy = isNew || grew

    if (needsCopy) {
      fs.mkdirSync(dir, { recursive: true })
      fs.copyFileSync(session.transcript.file, target)
    }

    // Metadata is refreshed every run: titles get filled in by the app long
    // after a session starts, so an early backup often has none.
    const meta = readTranscriptMeta(session.transcript.file)
    const record = {
      cliSessionId: id,
      sessionId: session.sessionId || previous?.sessionId || null,
      title: session.title || deriveTitle(meta, id),
      cwd: session.cwd || meta.cwd || previous?.cwd || null,
      model: session.model || meta.model || null,
      gitBranch: meta.gitBranch || null,
      createdAt: session.createdAt || previous?.createdAt || null,
      lastActivityAt: session.lastActivityAt || previous?.lastActivityAt || null,
      completedTurns: session.completedTurns ?? meta.userMessages,
      userMessages: meta.userMessages,
      assistantMessages: meta.assistantMessages,
      firstPrompt: meta.firstPrompt || previous?.firstPrompt || null,
      accountUuid: session.accountUuid || previous?.accountUuid || null,
      orgUuid: session.orgUuid || previous?.orgUuid || null,
      source: session.source,
      bytes: size,
      goneFromDisk: false,
      firstBackedUpAt: previous?.firstBackedUpAt || Date.now(),
      lastBackedUpAt: Date.now(),
    }

    manifest.sessions[id] = record
    writeJson(path.join(dir, 'meta.json'), record)

    if (isNew) result.added.push(record)
    else if (grew) result.updated.push(record)
    else result.unchanged.push(record)
  }

  saveManifest(vault, manifest)
  result.total = Object.keys(manifest.sessions).length
  return result
}

/** Every session held in the vault, newest activity first. */
export function listVault(vault = defaultVaultDir()) {
  const manifest = loadManifest(vault)
  return Object.values(manifest.sessions).sort(
    (a, b) => (b.lastActivityAt || 0) - (a.lastActivityAt || 0)
  )
}

/** Read a vaulted transcript back as an array of parsed JSONL rows. */
export function readVaultTranscript(vault, cliSessionId) {
  const file = path.join(sessionDir(vault, cliSessionId), 'transcript.jsonl')
  let raw
  try {
    raw = fs.readFileSync(file, 'utf8')
  } catch {
    return []
  }
  const rows = []
  for (const line of raw.split('\n')) {
    if (!line || line.charCodeAt(0) !== 123) continue
    try {
      rows.push(JSON.parse(line))
    } catch {
      /* a torn final line while a session is live — ignore it */
    }
  }
  return rows
}

/** Total bytes held in the vault. */
export function vaultSize(vault = defaultVaultDir()) {
  let bytes = 0
  const root = path.join(vault, 'sessions')
  let dirs
  try {
    dirs = fs.readdirSync(root)
  } catch {
    return 0
  }
  for (const dir of dirs) {
    try {
      bytes += fs.statSync(path.join(root, dir, 'transcript.jsonl')).size
    } catch {
      /* missing transcript */
    }
  }
  return bytes
}
