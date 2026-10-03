// Cairn - https://github.com/veax-project/claude-cairn
// Copyright (C) 2026 veax-project. Licensed under the GNU GPL v3 or later.

/**
 * The scenario the whole tool exists for.
 *
 * Someone signs into an account they have never used before. Claude has made
 * no folder for it, there is no history under it, and the account they were
 * using is gone for good. Everything has to come from the vault.
 *
 * This builds exactly that situation and runs the real code against it. The
 * check that matters is not "did files appear" but "are those files ones the
 * desktop app will accept" — an entry that deviates from the shape Claude
 * expects is dropped without a word, which is how this failed the first time.
 */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

process.env.CAIRN_TEST = '1'

const { buildFixture, ACCOUNTS } = await import('../scripts/demo-fixture.mjs')

const NEW_ACCOUNT = 'f3e91c05-8b72-4a6d-9e14-2c7a5d0f8b31'
const NEW_ORG = '5d2b7e94-1c68-4f30-a7b5-9e8d3c1f6a04'

console.log('\ncairn account-switch test\n')

const fixture = buildFixture()
Object.assign(process.env, fixture.env)

const appData = fixture.env.APPDATA
const vault = fixture.env.CAIRN_VAULT
const sessionsRoot = path.join(appData, 'Claude', 'claude-code-sessions')
const configFile = path.join(appData, 'Claude', 'config.json')

// ── the switch ──────────────────────────────────────────────────────────────
// Signing into a new account leaves exactly two traces before anything else
// happens: the account it remembers, and a settings key naming the new
// organisation. No session folder exists yet.

const config = JSON.parse(fs.readFileSync(configFile, 'utf8'))
config.lastKnownAccountUuid = NEW_ACCOUNT
config[`dxt:allowlistEnabled:${NEW_ORG}`] = true
fs.writeFileSync(configFile, JSON.stringify(config, null, 2))

assert.ok(
  !fs.existsSync(path.join(sessionsRoot, NEW_ACCOUNT)),
  'the new account must start with no folder at all'
)
console.log('  ok  signed into an account with no history and no folder')

// The old account is unreachable, but its conversations are in the vault.
const { listVault } = await import('../src/vault.js')
const saved = listVault(vault)
assert.ok(saved.length > 0, 'the vault must hold the conversations from before')
console.log(`  ok  ${saved.length} conversations waiting in the vault`)

// A backup records the id each conversation had in the sidebar it came from.
// The app's pins point at that id, so it is the one the new account must get.
const manifestFile = path.join(vault, 'manifest.json')
const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'))
const donorId = (id) => `local_${ACCOUNTS[0].account.slice(0, 8)}_${id}`
for (const [id, session] of Object.entries(manifest.sessions)) session.sessionId = donorId(id)
fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2))

// ── the recovery ────────────────────────────────────────────────────────────

const { mirror } = await import('../src/restore.js')
const result = mirror({ vault })

const targetDir = path.join(sessionsRoot, NEW_ACCOUNT, NEW_ORG)
assert.ok(fs.existsSync(targetDir), 'the folder for the new account was not created')
console.log('  ok  created the folder Claude will read for this account')

const written = fs
  .readdirSync(targetDir)
  .filter((f) => f.startsWith('local_') && f.endsWith('.json'))

assert.equal(
  written.length,
  saved.length,
  `expected every saved conversation to be filed, got ${written.length} of ${saved.length}`
)
console.log(`  ok  filed all ${written.length} conversations under the new account`)

const renamed = written.filter((name) => {
  const entry = JSON.parse(fs.readFileSync(path.join(targetDir, name), 'utf8'))
  return name !== `${donorId(entry.cliSessionId)}.json` || entry.sessionId !== donorId(entry.cliSessionId)
})
assert.deepEqual(renamed.slice(0, 3), [], 'a conversation lost its id, and with it its pin')
console.log('  ok  every conversation keeps the id its pin points at')

// ── would Claude accept them? ───────────────────────────────────────────────
// Compared against an entry the fixture wrote as the app itself would.

const reference = (() => {
  const donor = ACCOUNTS[0]
  const dir = path.join(sessionsRoot, donor.account, donor.org)
  const file = fs.readdirSync(dir).find((f) => f.startsWith('local_'))
  return JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
})()

// Fields the app itself writes only on some entries, so a reference entry
// picked at random will not have them: `isStarred` exists only while the
// session is pinned.
const OPTIONAL = new Set(['isStarred'])

const typeOf = (v) => (Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v)
const problems = []

for (const name of written) {
  const entry = JSON.parse(fs.readFileSync(path.join(targetDir, name), 'utf8'))

  for (const [key, value] of Object.entries(reference)) {
    if (!(key in entry)) problems.push(`${name}: missing ${key}`)
    else if (typeOf(entry[key]) !== typeOf(value)) {
      problems.push(`${name}: ${key} is ${typeOf(entry[key])}, Claude writes ${typeOf(value)}`)
    }
  }
  for (const key of Object.keys(entry)) {
    if (!(key in reference) && !OPTIONAL.has(key)) problems.push(`${name}: unknown field ${key}`)
  }

  // The two that actually broke it in the wild.
  if (typeof entry.createdAt !== 'number') problems.push(`${name}: createdAt must be a number`)
  if (!/^claude-[a-z0-9.-]+$/i.test(entry.model)) problems.push(`${name}: bad model "${entry.model}"`)
}

assert.deepEqual(problems.slice(0, 5), [], `entries Claude would drop:\n  ${problems.slice(0, 5).join('\n  ')}`)
console.log('  ok  every entry matches the shape Claude accepts')

// ── and the conversations themselves ────────────────────────────────────────

let readable = 0
for (const name of written) {
  const entry = JSON.parse(fs.readFileSync(path.join(targetDir, name), 'utf8'))
  const transcript = path.join(vault, 'sessions', entry.cliSessionId, 'transcript.jsonl')
  if (fs.existsSync(transcript) && fs.readFileSync(transcript, 'utf8').includes('"user"')) readable++
}
assert.equal(readable, written.length, 'some entries point at a conversation that is not there')
console.log(`  ok  all ${readable} point at a conversation that still reads back`)

// Running it twice must not double anything.
mirror({ vault })
const after = fs.readdirSync(targetDir).filter((f) => f.startsWith('local_')).length
assert.equal(after, written.length, 'a second sync duplicated entries')
console.log('  ok  syncing again changes nothing')

// ── weeks later, once Claude has deleted the originals ──────────────────────
// The 30-day cleanup does not care which account you are on. By the time
// someone comes back to an old conversation, the only copy left is the vault's,
// and the entry alone is useless without it.

const projects = path.join(fixture.env.CLAUDE_CONFIG_DIR, 'projects')
let removed = 0
for (const slug of fs.readdirSync(projects)) {
  for (const file of fs.readdirSync(path.join(projects, slug))) {
    fs.rmSync(path.join(projects, slug, file))
    removed++
  }
}
assert.ok(removed > 0, 'nothing was there to delete')

mirror({ vault })

let restored = 0
for (const slug of fs.readdirSync(projects)) {
  restored += fs.readdirSync(path.join(projects, slug)).filter((f) => f.endsWith('.jsonl')).length
}
assert.equal(restored, removed, `Claude deleted ${removed} conversations, only ${restored} came back`)
console.log(`  ok  put back all ${restored} conversations the 30-day cleanup had deleted`)

// ── the packaged build ──────────────────────────────────────────────────────
// The MSIX app keeps %APPDATA%\Claude inside its package container. Seen from
// an ordinary terminal, the plain folder is empty and every account vanishes.

let passed = 9
if (process.platform === 'win32') {
  const { appDataDir } = await import('../src/paths.js')
  const { currentAccount } = await import('../src/scan.js')
  const roaming = path.join(path.dirname(appData), 'Local', 'Packages', 'Claude_pzs8sxrjxfjjc', 'LocalCache', 'Roaming')
  fs.mkdirSync(roaming, { recursive: true })
  fs.renameSync(path.join(appData, 'Claude'), path.join(roaming, 'Claude'))

  assert.equal(appDataDir(), path.join(roaming, 'Claude'), 'the package container was not found')
  assert.equal(currentAccount()?.accountUuid, NEW_ACCOUNT, 'the account inside the container was not read')
  console.log('  ok  finds the packaged app\'s data from outside its container')
  passed++
}

fs.rmSync(fixture.root, { recursive: true, force: true })
console.log(`\n  ${passed} passed — a brand-new account recovers everything\n`)
