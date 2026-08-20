/**
 * Full-text index over the vault, built on the SQLite that ships inside Node.
 * No native module, no compile step, no dependency.
 */

import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { defaultVaultDir } from './paths.js'
import { listVault, readVaultTranscript } from './vault.js'
import { plainText } from './scan.js'

export function dbPath(vault = defaultVaultDir()) {
  return path.join(vault, 'index.db')
}

export function open(vault = defaultVaultDir()) {
  fs.mkdirSync(vault, { recursive: true })
  const db = new DatabaseSync(dbPath(vault))

  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id            TEXT PRIMARY KEY,
      title         TEXT,
      cwd           TEXT,
      model         TEXT,
      account       TEXT,
      created_at    INTEGER,
      last_activity INTEGER,
      turns         INTEGER,
      bytes         INTEGER
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS messages USING fts5(
      session_id UNINDEXED,
      seq        UNINDEXED,
      role       UNINDEXED,
      ts         UNINDEXED,
      body,
      tokenize = 'unicode61 remove_diacritics 2'
    );
  `)

  return db
}

/**
 * (Re)build the index from the vault.
 *
 * Only user and assistant prose is indexed. Tool calls and tool results are
 * the bulk of the bytes but almost never what someone searches for, and
 * indexing them buries real matches under file dumps.
 */
export function reindex(vault = defaultVaultDir(), { onProgress } = {}) {
  const db = open(vault)
  db.exec('DELETE FROM sessions; DELETE FROM messages;')

  const insertSession = db.prepare(
    `INSERT OR REPLACE INTO sessions
       (id, title, cwd, model, account, created_at, last_activity, turns, bytes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  const insertMessage = db.prepare(
    `INSERT INTO messages (session_id, seq, role, ts, body) VALUES (?, ?, ?, ?, ?)`
  )

  const sessions = listVault(vault)
  let indexedMessages = 0

  db.exec('BEGIN')
  for (const [i, session] of sessions.entries()) {
    insertSession.run(
      session.cliSessionId,
      session.title || '',
      session.cwd || '',
      session.model || '',
      session.accountUuid || '',
      session.createdAt || 0,
      session.lastActivityAt || 0,
      session.completedTurns || 0,
      session.bytes || 0
    )

    let seq = 0
    for (const row of readVaultTranscript(vault, session.cliSessionId)) {
      if (row.type !== 'user' && row.type !== 'assistant') continue
      const body = plainText(row.message?.content)
      if (!body) continue
      insertMessage.run(session.cliSessionId, seq++, row.type, row.timestamp || '', body)
      indexedMessages++
    }

    if (onProgress) onProgress(i + 1, sessions.length, session.title)
  }
  db.exec('COMMIT')

  db.close()
  return { sessions: sessions.length, messages: indexedMessages }
}

/**
 * Search the index.
 *
 * Returns one row per matching message with a highlighted snippet, ordered by
 * relevance. `bm25` is ascending — lower is a better match.
 */
export function search(query, { vault = defaultVaultDir(), limit = 30, sessionId = null } = {}) {
  const db = open(vault)
  try {
    const where = sessionId ? 'AND m.session_id = ?' : ''
    const sql = `
      SELECT m.session_id AS sessionId,
             m.seq        AS seq,
             m.role       AS role,
             m.ts         AS ts,
             snippet(messages, 4, '«', '»', '…', 18) AS snippet,
             bm25(messages) AS score,
             s.title      AS title,
             s.cwd        AS cwd,
             s.last_activity AS lastActivity
      FROM messages m
      LEFT JOIN sessions s ON s.id = m.session_id
      WHERE messages MATCH ? ${where}
      ORDER BY score
      LIMIT ?
    `
    const args = sessionId ? [toMatch(query), sessionId, limit] : [toMatch(query), limit]
    return db.prepare(sql).all(...args)
  } catch (error) {
    // A malformed MATCH expression — a stray quote, a bare operator, an
    // unbalanced paren — is a user typo, not a crash. SQLite reports these
    // under several different messages, so retry anything it rejects as a
    // literal phrase before giving up.
    const isQueryError = error?.code === 'ERR_SQLITE_ERROR' || /fts5|syntax|malformed|unterminated/i.test(error?.message || '')
    if (!isQueryError) throw error

    try {
      const phrase = `"${String(query).replace(/"/g, ' ')}"`
      return db.prepare(
        `SELECT m.session_id AS sessionId, m.seq AS seq, m.role AS role, m.ts AS ts,
                snippet(messages, 4, '«', '»', '…', 18) AS snippet,
                bm25(messages) AS score, s.title AS title, s.cwd AS cwd,
                s.last_activity AS lastActivity
         FROM messages m LEFT JOIN sessions s ON s.id = m.session_id
         WHERE messages MATCH ? ORDER BY score LIMIT ?`
      ).all(phrase, limit)
    } catch {
      // Even as a phrase it is unusable (empty, or punctuation only).
      return []
    }
  } finally {
    db.close()
  }
}

/** Session rows, newest first. */
export function sessions({ vault = defaultVaultDir(), limit = 500 } = {}) {
  const db = open(vault)
  try {
    return db
      .prepare(`SELECT * FROM sessions ORDER BY last_activity DESC LIMIT ?`)
      .all(limit)
  } finally {
    db.close()
  }
}

export function stats(vault = defaultVaultDir()) {
  const db = open(vault)
  try {
    const s = db.prepare('SELECT COUNT(*) AS n FROM sessions').get()
    const m = db.prepare('SELECT COUNT(*) AS n FROM messages').get()
    return { sessions: s?.n ?? 0, messages: m?.n ?? 0 }
  } finally {
    db.close()
  }
}

/**
 * Turn a plain query into an FTS5 MATCH expression.
 * Bare words become a prefix-matched AND; quoted runs are kept as phrases.
 */
function toMatch(query) {
  const trimmed = String(query || '').trim()
  if (!trimmed) return '""'
  if (/[":*()]|\bOR\b|\bAND\b|\bNOT\b/.test(trimmed)) return trimmed
  return trimmed
    .split(/\s+/)
    .map((word) => `"${word.replace(/"/g, '')}"*`)
    .join(' AND ')
}
