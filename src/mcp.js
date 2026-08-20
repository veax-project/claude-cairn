/**
 * MCP server (stdio, JSON-RPC 2.0).
 *
 * This is the part that makes switching accounts stop mattering. MCP servers
 * are configured per machine, not per account — so a fresh account picks the
 * archive up automatically, with nothing to re-import and nothing to re-upload.
 *
 * Tool results are budgeted deliberately. MCP output is capped (Claude Code
 * warns past ~10k tokens and truncates past ~25k), so the three tools form a
 * ladder: cheap search, then an outline, then paged message bodies.
 */

import { search as ftsSearch, sessions as listSessions, stats } from './db.js'
import { readVaultTranscript, listVault } from './vault.js'
import { plainText } from './scan.js'
import { defaultVaultDir } from './paths.js'

const PROTOCOL_VERSION = '2024-11-05'
const SNIPPET_CHARS = 220
const MAX_BODY_CHARS = 60_000

const TOOLS = [
  {
    name: 'search_conversations',
    description:
      'Search the full text of every archived Claude Code conversation, across all past accounts. ' +
      'Returns matching sessions with a short snippet — no message bodies. ' +
      'Use this first, then get_conversation_outline or get_messages to read further.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Words to search for.' },
        limit: { type: 'number', description: 'Maximum results (default 15, max 50).' },
      },
      required: ['query'],
    },
  },
  {
    name: 'list_conversations',
    description:
      'List archived conversations newest first, optionally filtered by project directory. ' +
      'Use when the user refers to a conversation by when it happened or what project it belonged to.',
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Substring of the project path to filter on.' },
        limit: { type: 'number', description: 'Maximum results (default 30, max 100).' },
      },
    },
  },
  {
    name: 'get_conversation_outline',
    description:
      'One line per message in a conversation: role, timestamp, and the opening of the text. ' +
      'Cheap way to locate the part worth reading in full.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string', description: 'Session id from a search or list result.' },
      },
      required: ['session_id'],
    },
  },
  {
    name: 'get_messages',
    description:
      'Read the actual message bodies of an archived conversation, paginated. ' +
      'Start at from_index 0 and follow next_index while has_more is true.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string', description: 'Session id from a search or list result.' },
        from_index: { type: 'number', description: 'Zero-based message index to start at (default 0).' },
        count: { type: 'number', description: 'How many messages to return (default 20, max 60).' },
        include_thinking: { type: 'boolean', description: 'Include Claude reasoning blocks (default false).' },
      },
      required: ['session_id'],
    },
  },
]

export function startMcpServer({ vault = defaultVaultDir() } = {}) {
  let buffer = ''

  process.stdin.setEncoding('utf8')
  process.stdin.on('data', (chunk) => {
    buffer += chunk
    let newline
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline).trim()
      buffer = buffer.slice(newline + 1)
      if (line) handleLine(line, vault)
    }
  })

  process.stdin.on('end', () => process.exit(0))
  // Everything human-readable goes to stderr; stdout is the protocol channel.
  process.stderr.write(`[cairn] MCP server ready — vault: ${vault}\n`)
}

function handleLine(line, vault) {
  let message
  try {
    message = JSON.parse(line)
  } catch {
    return
  }

  // Notifications carry no id and expect no reply.
  if (message.id === undefined || message.id === null) return

  try {
    const result = dispatch(message, vault)
    if (result !== undefined) send({ jsonrpc: '2.0', id: message.id, result })
  } catch (error) {
    send({
      jsonrpc: '2.0',
      id: message.id,
      error: { code: -32603, message: error?.message || 'internal error' },
    })
  }
}

function dispatch(message, vault) {
  switch (message.method) {
    case 'initialize':
      return {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: 'claude-cairn', version: '1.0.0' },
      }

    case 'ping':
      return {}

    case 'tools/list':
      return { tools: TOOLS }

    case 'tools/call':
      return callTool(message.params, vault)

    default:
      throw new Error(`unknown method: ${message.method}`)
  }
}

function callTool(params, vault) {
  const name = params?.name
  const args = params?.arguments || {}

  switch (name) {
    case 'search_conversations':
      return text(doSearch(args, vault))
    case 'list_conversations':
      return text(doList(args, vault))
    case 'get_conversation_outline':
      return text(doOutline(args, vault))
    case 'get_messages':
      return text(doMessages(args, vault))
    default:
      throw new Error(`unknown tool: ${name}`)
  }
}

function doSearch(args, vault) {
  const query = String(args.query || '').trim()
  if (!query) return 'Provide a query.'

  const limit = clamp(args.limit ?? 15, 1, 50)
  const hits = ftsSearch(query, { vault, limit: limit * 3 })

  // Collapse to one entry per conversation, keeping its best-scoring snippet.
  const bySession = new Map()
  for (const hit of hits) {
    if (bySession.has(hit.sessionId)) continue
    bySession.set(hit.sessionId, hit)
    if (bySession.size >= limit) break
  }

  if (bySession.size === 0) {
    const { sessions: n } = stats(vault)
    return n === 0
      ? 'The archive is empty. Run `npx claude-cairn backup` first.'
      : `No match for "${query}" across ${n} archived conversations.`
  }

  const lines = [`${bySession.size} conversation(s) matching "${query}":`, '']
  for (const hit of bySession.values()) {
    lines.push(`- **${hit.title || 'Untitled'}** — ${date(hit.lastActivity)}`)
    lines.push(`  session_id: \`${hit.sessionId}\``)
    if (hit.cwd) lines.push(`  project: ${hit.cwd}`)
    lines.push(`  …${collapse(hit.snippet).slice(0, SNIPPET_CHARS)}…`)
    lines.push('')
  }
  lines.push('Use get_conversation_outline or get_messages with a session_id to read more.')
  return lines.join('\n')
}

function doList(args, vault) {
  const limit = clamp(args.limit ?? 30, 1, 100)
  const filter = String(args.project || '').toLowerCase()

  let rows = listSessions({ vault, limit: 500 })
  if (filter) rows = rows.filter((r) => String(r.cwd || '').toLowerCase().includes(filter))
  rows = rows.slice(0, limit)

  if (rows.length === 0) return filter ? `No archived conversation under a project matching "${args.project}".` : 'The archive is empty.'

  const lines = [`${rows.length} archived conversation(s):`, '']
  for (const row of rows) {
    lines.push(`- **${row.title || 'Untitled'}** — ${date(row.last_activity)} — ${row.turns || 0} turns`)
    lines.push(`  session_id: \`${row.id}\`${row.cwd ? ` — ${row.cwd}` : ''}`)
  }
  return lines.join('\n')
}

function doOutline(args, vault) {
  const id = String(args.session_id || '')
  const rows = readVaultTranscript(vault, id)
  if (rows.length === 0) return `No archived conversation with id ${id}.`

  const meta = listVault(vault).find((s) => s.cliSessionId === id)
  const lines = [`# ${meta?.title || id}`, '']
  if (meta?.cwd) lines.push(`Project: ${meta.cwd}`)
  lines.push('')

  let index = 0
  for (const row of rows) {
    if (row.type !== 'user' && row.type !== 'assistant') continue
    const body = plainText(row.message?.content)
    if (!body) continue
    const who = row.type === 'user' ? 'you' : 'claude'
    lines.push(`${String(index).padStart(3, ' ')}. [${who}] ${collapse(body).slice(0, 110)}`)
    index++
  }

  lines.push('')
  lines.push(`${index} messages. Use get_messages with from_index to read the bodies.`)
  return lines.join('\n')
}

function doMessages(args, vault) {
  const id = String(args.session_id || '')
  const from = Math.max(0, Number(args.from_index) || 0)
  const count = clamp(args.count ?? 20, 1, 60)
  const includeThinking = args.include_thinking === true

  const rows = readVaultTranscript(vault, id)
  if (rows.length === 0) return `No archived conversation with id ${id}.`

  const messages = []
  for (const row of rows) {
    if (row.type !== 'user' && row.type !== 'assistant') continue
    const body = plainText(row.message?.content, { includeThinking })
    if (!body) continue
    messages.push({ role: row.type, ts: row.timestamp, body })
  }

  const slice = messages.slice(from, from + count)
  if (slice.length === 0) return `from_index ${from} is past the end (${messages.length} messages).`

  const lines = []
  let chars = 0
  let emitted = 0

  for (const message of slice) {
    const header = message.role === 'user' ? '### You' : '### Claude'
    const block = `${header}\n\n${message.body}\n`
    // Stop before overrunning the tool-result budget rather than being truncated.
    if (chars + block.length > MAX_BODY_CHARS && emitted > 0) break
    lines.push(block)
    chars += block.length
    emitted++
  }

  const next = from + emitted
  const hasMore = next < messages.length
  lines.push('---')
  lines.push(
    `Messages ${from}–${next - 1} of ${messages.length}.` +
      (hasMore ? ` has_more: true, next_index: ${next}` : ' has_more: false')
  )
  return lines.join('\n')
}

function text(body) {
  return { content: [{ type: 'text', text: String(body) }] }
}

function send(payload) {
  process.stdout.write(JSON.stringify(payload) + '\n')
}

function clamp(value, min, max) {
  const n = Number(value)
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, Math.floor(n)))
}

function collapse(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function date(ms) {
  if (!ms) return 'undated'
  return new Date(Number(ms)).toISOString().slice(0, 10)
}
