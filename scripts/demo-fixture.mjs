/**
 * Builds a throwaway Claude installation with invented data.
 *
 * Screenshots have to come from somewhere, and the obvious source — the
 * author's own machine — would put real account identifiers, a real name and
 * real project paths into a public repository. So the screenshot script runs
 * against this instead: a temporary directory shaped exactly like a real
 * Claude install, filled with conversations that never happened.
 */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const ACCOUNTS = [
  { account: '7c1e05a4-1f2b-4d3c-9a8e-0b6d4f2a1c93', org: '2f9a7b31-5c4d-4e8a-b1f6-3d7e9c0a4b25' },
  { account: 'b48f2d61-9e37-4a05-8c72-1f5b6d0e3a97', org: '2f9a7b31-5c4d-4e8a-b1f6-3d7e9c0a4b25' },
  { account: 'd92c6e78-3a41-4b90-a5d8-7e2f1c8b0d46', org: '6b3d8f52-7a19-4c6e-9d02-5f8a1e4b7c30' },
]

const PROJECTS = ['/home/jane/code/atlas', '/home/jane/code/ledger', '/home/jane/notes']

const TITLES = [
  'Rewrite the auth middleware', 'Why is the build 40s slower', 'Migrate to the new router',
  'Flaky test in the payments suite', 'Draft the release notes', 'Sketch the settings page',
  'Cache invalidation on deploy', 'Trim the docker image', 'Handle timezones properly',
  'Rename the config keys', 'Add retries to the webhook', 'Explain this stack trace',
  'Split the monolith config', 'Speed up the search index', 'Refactor the date helpers',
  'Audit the third-party scripts', 'Fix the sticky header', 'Batch the API calls',
  'Write the onboarding email', 'Prune the old feature flags', 'Debug the memory growth',
  'Set up preview deploys', 'Tidy the error messages', 'Compare the two parsers',
]

/** Creates the fixture and returns the environment that points at it. */
export function buildFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cairn-demo-'))
  const home = path.join(root, 'home')
  const appData = path.join(root, 'appdata')
  const claude = path.join(home, '.claude')
  const vault = path.join(root, 'vault')

  fs.mkdirSync(path.join(claude, 'projects'), { recursive: true })
  fs.mkdirSync(path.join(vault, 'sessions'), { recursive: true })

  // The signed-in identity, exactly where Claude Code keeps it.
  fs.writeFileSync(
    path.join(home, '.claude.json'),
    JSON.stringify({
      oauthAccount: {
        accountUuid: ACCOUNTS[0].account,
        organizationUuid: ACCOUNTS[0].org,
        emailAddress: 'jane@example.com',
        displayName: 'Jane Doe',
        organizationName: "jane@example.com's Organization",
      },
    }, null, 2)
  )

  // Settings without cleanupPeriodDays, so the 30-day warning is truthful.
  fs.writeFileSync(path.join(claude, 'settings.json'), JSON.stringify({}, null, 2))

  fs.mkdirSync(path.join(appData, 'Claude', 'claude-code-sessions'), { recursive: true })

  const day = 86_400_000
  const now = Date.parse('2026-08-20T09:00:00Z')
  const manifest = { version: 1, createdAt: now, updatedAt: now, sessions: {} }

  TITLES.forEach((title, i) => {
    const id = `${(i + 16).toString(16).padStart(8, '0')}-4a1b-4c2d-8e3f-${(i * 7919).toString(16).padStart(12, '0')}`
    const cwd = PROJECTS[i % PROJECTS.length]
    const at = now - i * day * 1.4

    const rows = [
      { type: 'user', message: { role: 'user', content: title + '?' }, timestamp: new Date(at).toISOString(), cwd },
      { type: 'assistant', message: { role: 'assistant', model: 'claude-opus-5', content: [{ type: 'text', text: 'Here is what I would do.' }] }, timestamp: new Date(at + 4000).toISOString(), cwd },
    ]

    const dir = path.join(vault, 'sessions', id)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'transcript.jsonl'), rows.map((r) => JSON.stringify(r)).join('\n') + '\n')

    manifest.sessions[id] = {
      cliSessionId: id, title, cwd, model: 'claude-opus-5',
      createdAt: at, lastActivityAt: at + 4000,
      completedTurns: 1 + (i % 30), userMessages: 1, assistantMessages: 1,
      bytes: 120_000 + i * 9_000,
    }

    // Every account holds every conversation — the state Cairn maintains once
    // it is running, and the one the screenshots should show.
    for (const target of ACCOUNTS) {
      const entryDir = path.join(appData, 'Claude', 'claude-code-sessions', target.account, target.org)
      fs.mkdirSync(entryDir, { recursive: true })
      fs.writeFileSync(
        path.join(entryDir, `local_${target.account.slice(0, 8)}_${id}.json`),
        JSON.stringify({
          sessionId: `local_${target.account.slice(0, 8)}_${id}`, cliSessionId: id, cwd, originCwd: cwd,
          lastFocusedAt: at + 4000, createdAt: at, lastActivityAt: at + 4000,
          model: 'claude-opus-5', effort: 'high', isArchived: false,
          title, titleSource: 'auto', permissionMode: 'auto',
          remoteMcpServersConfig: [], chromePermissionMode: 'skip_all_permission_checks',
          bridgeSessionIds: [], alwaysAllowedReasons: [], sessionPermissionUpdates: [],
          classifierSummaryEnabled: true, reportFindingsCard: true, spawnSeed: {},
          completedTurns: 1 + (i % 30),
        }, null, 2)
      )
    }

    const slug = cwd.replace(/[^a-zA-Z0-9]/g, '-')
    fs.mkdirSync(path.join(claude, 'projects', slug), { recursive: true })
    fs.writeFileSync(
      path.join(claude, 'projects', slug, `${id}.jsonl`),
      rows.map((r) => JSON.stringify(r)).join('\n') + '\n'
    )
  })

  // Background sync switched on, so the screenshots show the state the tool is
  // meant to be left in rather than a fresh, unprotected install.
  const startup = path.join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup')
  fs.mkdirSync(startup, { recursive: true })
  fs.writeFileSync(path.join(startup, 'claude-cairn.vbs'), "' demo\n")

  fs.writeFileSync(path.join(vault, 'manifest.json'), JSON.stringify(manifest, null, 2))
  fs.writeFileSync(
    path.join(appData, 'Claude', 'config.json'),
    JSON.stringify({ lastKnownAccountUuid: ACCOUNTS[0].account }, null, 2)
  )
  fs.writeFileSync(
    path.join(vault, 'accounts.json'),
    JSON.stringify({
      version: 1,
      accounts: {
        [ACCOUNTS[0].account]: {
          accountUuid: ACCOUNTS[0].account, email: 'jane@example.com',
          displayName: 'Jane Doe', firstSeenAt: now, lastSeenAt: now, customName: null,
        },
      },
    }, null, 2)
  )

  return {
    root,
    env: { HOME: home, USERPROFILE: home, APPDATA: appData, CLAUDE_CONFIG_DIR: claude, CAIRN_VAULT: vault },
  }
}
