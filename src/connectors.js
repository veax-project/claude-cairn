// Cairn - https://github.com/veax-project/claude-cairn
// Copyright (C) 2026 veax-project. Licensed under the GNU GPL v3 or later.

/**
 * Which connectors you had, and which ones the account you are on is missing.
 *
 * Connectors cannot be transferred. Connecting Vercel or Gmail to Claude is an
 * authorisation held on Anthropic's servers against one account; nothing on
 * this machine holds a credential, a URL or anything else that could be copied
 * somewhere else. Signing into a new account means clicking through each
 * provider again, and no tool changes that.
 *
 * What is on disk is the list. Every session records the connectors it had
 * available, by name, so Cairn can tell you exactly what you had rather than
 * leaving you to remember. That is the difference between an afternoon of
 * "what am I forgetting" and ten minutes of clicking.
 */

import fs from 'node:fs'
import path from 'node:path'
import { currentAccount, scanAccounts } from './scan.js'
import { defaultVaultDir, readJson, writeJson } from './paths.js'

function connectorsPath(vault) {
  return path.join(vault, 'connectors.json')
}

/**
 * Every connector seen on this machine, grouped by name.
 *
 * The identifier differs per account — the same Vercel connection has a new
 * one each time you authorise it — so the name is what carries across.
 */
export function scanConnectors() {
  const current = currentAccount()
  const byName = new Map()

  for (const account of scanAccounts()) {
    const isCurrent = account.accountUuid === current?.accountUuid

    for (const entry of account.entries) {
      const servers = Array.isArray(entry.remoteMcpServersConfig) ? entry.remoteMcpServersConfig : []
      const usedAt = Number(entry.lastActivityAt) || Number(entry.createdAt) || 0

      for (const server of servers) {
        const name = String(server?.name || '').trim()
        if (!name) continue

        const seen = byName.get(name) || {
          name,
          sessions: 0,
          lastUsedAt: 0,
          tools: 0,
          accounts: new Set(),
          onCurrentAccount: false,
        }

        seen.sessions++
        seen.lastUsedAt = Math.max(seen.lastUsedAt, usedAt)
        seen.tools = Math.max(seen.tools, Array.isArray(server.tools) ? server.tools.length : 0)
        seen.accounts.add(account.accountUuid)
        if (isCurrent) seen.onCurrentAccount = true

        byName.set(name, seen)
      }
    }
  }

  return [...byName.values()]
    .map((c) => ({ ...c, accounts: c.accounts.size }))
    .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
}

/**
 * Remember what was found, merged with what was already known.
 *
 * Worth storing rather than recomputing: once an old account's folder is gone,
 * the only record that a connector ever existed is this file.
 */
export function captureConnectors(vault = defaultVaultDir()) {
  const store = readJson(connectorsPath(vault), { version: 1, connectors: {} })
  const found = scanConnectors()

  for (const c of found) {
    const previous = store.connectors[c.name] || {}
    store.connectors[c.name] = {
      name: c.name,
      tools: Math.max(previous.tools || 0, c.tools),
      sessions: Math.max(previous.sessions || 0, c.sessions),
      lastUsedAt: Math.max(previous.lastUsedAt || 0, c.lastUsedAt),
      firstSeenAt: previous.firstSeenAt || Date.now(),
    }
  }

  writeJson(connectorsPath(vault), store)
  return found
}

/**
 * The checklist: what you had, and what this account still needs.
 * `missing` is the part worth acting on.
 */
export function connectorReport(vault = defaultVaultDir()) {
  const live = scanConnectors()
  const remembered = readJson(connectorsPath(vault), { connectors: {} }).connectors || {}
  const onCurrent = new Set(live.filter((c) => c.onCurrentAccount).map((c) => c.name))

  // Everything ever seen, live or only remembered from a folder since removed.
  const names = new Set([...live.map((c) => c.name), ...Object.keys(remembered)])
  const all = [...names].map((name) => {
    const l = live.find((c) => c.name === name)
    const r = remembered[name] || {}
    return {
      name,
      tools: l?.tools || r.tools || 0,
      lastUsedAt: l?.lastUsedAt || r.lastUsedAt || 0,
      onCurrentAccount: onCurrent.has(name),
    }
  })

  all.sort((a, b) => b.lastUsedAt - a.lastUsedAt)
  return {
    all,
    present: all.filter((c) => c.onCurrentAccount),
    missing: all.filter((c) => !c.onCurrentAccount),
  }
}
