// Cairn - https://github.com/veax-project/claude-cairn
// Copyright (C) 2026 veax-project. Licensed under the GNU GPL v3 or later.

/**
 * Putting names on accounts.
 *
 * The session folders are keyed by account UUID and nothing on disk maps a
 * UUID back to a person: the desktop app's OAuth cache is encrypted, and the
 * logs never write the address. Only the account you are signed into right now
 * identifies itself, in ~/.claude.json.
 *
 * So Cairn writes that identity down every time it runs. Because the watcher
 * runs every few minutes, each account gets named the first time you use it,
 * and stays named forever after. Accounts used before Cairn existed keep their
 * UUID until you name them by hand.
 */

import os from 'node:os'
import path from 'node:path'
import { defaultVaultDir, readJson, writeJson } from './paths.js'

function accountsPath(vault) {
  return path.join(vault, 'accounts.json')
}

/** Identity of the account currently signed in, or null. */
export function currentIdentity() {
  const file = path.join(os.homedir(), '.claude.json')
  const account = readJson(file, {})?.oauthAccount
  if (!account?.accountUuid) return null

  return {
    accountUuid: account.accountUuid,
    email: account.emailAddress || null,
    displayName: account.displayName || null,
    organizationUuid: account.organizationUuid || null,
    // "someone@example.com's Organization" is the auto-generated name for a
    // personal account and says nothing a human needs to read.
    organizationName:
      account.organizationName && !/'s Organization$/.test(account.organizationName)
        ? account.organizationName
        : null,
    accountCreatedAt: account.accountCreatedAt || null,
  }
}

export function loadAccounts(vault = defaultVaultDir()) {
  return readJson(accountsPath(vault), { version: 1, accounts: {} })
}

/**
 * Record whoever is signed in right now. Safe to call on every cycle: it only
 * writes when something actually changed.
 */
export function captureIdentity(vault = defaultVaultDir()) {
  const identity = currentIdentity()
  if (!identity) return null

  const store = loadAccounts(vault)
  const previous = store.accounts[identity.accountUuid] || {}
  const merged = {
    ...previous,
    ...identity,
    // A name the user typed always wins over what the API reports.
    customName: previous.customName || null,
    firstSeenAt: previous.firstSeenAt || Date.now(),
    lastSeenAt: Date.now(),
  }

  const changed = JSON.stringify({ ...previous, lastSeenAt: 0 }) !== JSON.stringify({ ...merged, lastSeenAt: 0 })
  store.accounts[identity.accountUuid] = merged
  if (changed || !previous.firstSeenAt) writeJson(accountsPath(vault), store)

  return merged
}

/** Give an account a name by hand. Pass null to clear it. */
export function setName(vault, accountUuid, name) {
  const store = loadAccounts(vault)
  const entry = store.accounts[accountUuid] || { accountUuid }
  entry.customName = name ? String(name).trim().slice(0, 60) || null : null
  store.accounts[accountUuid] = entry
  writeJson(accountsPath(vault), store)
  return entry
}

/**
 * What to show for an account.
 * `{ name, detail, known }` — name is never empty, detail may be.
 */
export function label(accountUuid, store) {
  const entry = store?.accounts?.[accountUuid]
  const short = `${accountUuid.slice(0, 8)}…`

  if (entry?.customName) {
    return { name: entry.customName, detail: entry.email || short, known: true }
  }
  if (entry?.displayName) {
    return { name: entry.displayName, detail: entry.email || short, known: true }
  }
  if (entry?.email) {
    return { name: entry.email, detail: short, known: true }
  }
  return { name: short, detail: '', known: false }
}

/**
 * A hint for an account nobody has named yet: when it was last used and one of
 * the conversations it holds, which is usually enough to recognise it.
 *
 * Only entries the account had of its own count. Once everything is mirrored
 * each account holds every conversation, so counting those would show the same
 * recent title against all of them and identify nothing.
 */
export function hintFor(account, sessions, mirrored = new Set()) {
  const ids = new Set(
    account.entries.filter((e) => !mirrored.has(e._file)).map((e) => e.cliSessionId).filter(Boolean)
  )
  const owned = sessions.filter((s) => ids.has(s.cliSessionId) && s.lastActivityAt)
  if (owned.length === 0) return null

  owned.sort((a, b) => (b.lastActivityAt || 0) - (a.lastActivityAt || 0))
  const last = new Date(owned[0].lastActivityAt).toISOString().slice(0, 10)
  const title = owned[0].title || null
  const count = owned.length
  const scale = `${count} of its own`
  return title ? `${scale} · last ${last} · “${title}”` : `${scale} · last ${last}`
}
