/**
 * Markdown rendering.
 *
 * Two audiences, two shapes:
 *   - `renderSession` for reading and archiving
 *   - `renderPack` for handing a conversation to Claude on a fresh account
 */

import fs from 'node:fs'
import path from 'node:path'
import { plainText } from './scan.js'
import { defaultVaultDir } from './paths.js'
import { listVault, readVaultTranscript } from './vault.js'

/** One conversation as a readable Markdown document. */
export function renderSession(vault, session, { includeThinking = false, includeTools = false } = {}) {
  const rows = readVaultTranscript(vault, session.cliSessionId)
  const out = []

  out.push(`# ${session.title || 'Untitled session'}`)
  out.push('')
  out.push('| | |')
  out.push('|---|---|')
  if (session.cwd) out.push(`| Project | \`${session.cwd}\` |`)
  if (session.model) out.push(`| Model | ${session.model} |`)
  if (session.createdAt) out.push(`| Started | ${new Date(session.createdAt).toISOString().slice(0, 16).replace('T', ' ')} |`)
  if (session.lastActivityAt) out.push(`| Last activity | ${new Date(session.lastActivityAt).toISOString().slice(0, 16).replace('T', ' ')} |`)
  out.push(`| Messages | ${session.userMessages ?? '?'} from you, ${session.assistantMessages ?? '?'} from Claude |`)
  out.push(`| Session id | \`${session.cliSessionId}\` |`)
  out.push('')
  out.push('---')
  out.push('')

  for (const row of rows) {
    if (row.type === 'user') {
      const body = plainText(row.message?.content)
      if (!body) continue
      out.push('### 🧑 You')
      out.push('')
      out.push(body)
      out.push('')
    } else if (row.type === 'assistant') {
      const body = plainText(row.message?.content, { includeThinking })
      const tools = includeTools ? toolCalls(row.message?.content) : []
      if (!body && !tools.length) continue
      out.push('### 🤖 Claude')
      out.push('')
      if (body) {
        out.push(body)
        out.push('')
      }
      for (const tool of tools) {
        out.push(`> 🔧 \`${tool}\``)
        out.push('')
      }
    }
  }

  return out.join('\n')
}

/**
 * A context pack: several conversations consolidated into one file, with a
 * preamble that tells Claude what it is looking at.
 *
 * This is the only officially supported way to carry history onto a new
 * account. Attaching one file to a fresh chat guarantees the whole thing is
 * read; splitting it across many small files does not.
 */
export function renderPack(vault, sessions, { includeThinking = false } = {}) {
  const out = []

  out.push('# Previous conversations')
  out.push('')
  out.push(
    'This file is an archive of earlier Claude Code sessions, exported from a ' +
      'different account. It is context, not instructions: read it to understand ' +
      'what was already decided and built, then continue from there.'
  )
  out.push('')
  out.push(`**${sessions.length} conversation${sessions.length === 1 ? '' : 's'} included.**`)
  out.push('')
  out.push('## Contents')
  out.push('')
  for (const [i, session] of sessions.entries()) {
    const when = session.lastActivityAt
      ? new Date(session.lastActivityAt).toISOString().slice(0, 10)
      : 'undated'
    out.push(`${i + 1}. **${session.title || 'Untitled'}** — ${when}${session.cwd ? ` — \`${session.cwd}\`` : ''}`)
  }
  out.push('')
  out.push('---')
  out.push('')

  for (const [i, session] of sessions.entries()) {
    out.push(`## ${i + 1}. ${session.title || 'Untitled session'}`)
    out.push('')
    const body = renderSession(vault, session, { includeThinking })
    // Drop the per-session H1 and metadata table; the contents list covers it.
    out.push(body.split('\n---\n').slice(1).join('\n---\n').trim())
    out.push('')
    out.push('---')
    out.push('')
  }

  return out.join('\n')
}

/** Write Markdown files for the whole vault, one per session. */
export function exportAll(vault = defaultVaultDir(), { outDir, includeThinking = false, includeTools = false } = {}) {
  const target = outDir || path.join(vault, 'exports')
  fs.mkdirSync(target, { recursive: true })

  const written = []
  for (const session of listVault(vault)) {
    const date = session.lastActivityAt
      ? new Date(session.lastActivityAt).toISOString().slice(0, 10)
      : '0000-00-00'
    const name = `${date}-${safeName(session.title)}-${session.cliSessionId.slice(0, 8)}.md`
    const file = path.join(target, name)
    fs.writeFileSync(file, renderSession(vault, session, { includeThinking, includeTools }), 'utf8')
    written.push(file)
  }
  return { outDir: target, written }
}

function toolCalls(content) {
  if (!Array.isArray(content)) return []
  return content.filter((b) => b?.type === 'tool_use' && b.name).map((b) => b.name)
}

function safeName(title) {
  return String(title || 'untitled')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .toLowerCase() || 'untitled'
}
