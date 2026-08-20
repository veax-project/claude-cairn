/**
 * Cross-platform discovery of where Claude keeps its data.
 *
 * Two separate stores matter, and conflating them is the single most common
 * mistake when reasoning about "lost" Claude Code conversations:
 *
 *   1. TRANSCRIPTS  ~/.claude/projects/<project-slug>/<cliSessionId>.jsonl
 *      The actual conversation content. Not tied to any account.
 *      Deleted by Claude Code's own garbage collector after `cleanupPeriodDays`
 *      (default: 30 days).
 *
 *   2. SESSION INDEX  <appData>/Claude/claude-code-sessions/<accountUuid>/<orgUuid>/local_*.json
 *      The entries the desktop app lists in its sidebar. Partitioned per
 *      account, which is why switching accounts appears to erase your history:
 *      the app only reads the folder of the account you are signed into.
 */

import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

/** Root of the Claude Desktop application data directory. */
export function appDataDir() {
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
    return path.join(appData, 'Claude')
  }
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'Claude')
  }
  const xdg = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config')
  return path.join(xdg, 'Claude')
}

/** Root of the Claude Code CLI data directory (holds the transcripts). */
export function claudeHome() {
  return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude')
}

/** Where transcripts live, one sub-directory per project working directory. */
export function projectsDir() {
  return path.join(claudeHome(), 'projects')
}

/** Where the desktop app keeps its per-account session index. */
export function sessionIndexRoot() {
  return path.join(appDataDir(), 'claude-code-sessions')
}

/**
 * Default vault location.
 *
 * Deliberately OUTSIDE ~/.claude — that directory is what Claude Code's
 * garbage collector prunes, so a backup stored inside it would be deleted
 * along with the originals.
 *
 * Also deliberately outside %APPDATA% on Windows: Claude Desktop ships as an
 * MSIX package, and child processes it spawns get their %APPDATA% writes
 * redirected into the package container. A vault under %APPDATA% would end up
 * in a different place depending on how Cairn was launched.
 */
export function defaultVaultDir() {
  if (process.env.CAIRN_VAULT) return path.resolve(process.env.CAIRN_VAULT)
  return path.join(os.homedir(), 'ClaudeCairn')
}

/** Path to the desktop app's config file (tells us the signed-in account). */
export function desktopConfigPath() {
  return path.join(appDataDir(), 'config.json')
}

/** Path to the Claude Code settings file (holds `cleanupPeriodDays`). */
export function claudeSettingsPath() {
  return path.join(claudeHome(), 'settings.json')
}

/** Read a JSON file, returning `fallback` on any failure. */
export function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}

/** Write a JSON file, creating parent directories as needed. */
export function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf8')
}

/** True if `p` exists and is a directory. */
export function isDir(p) {
  try {
    return fs.statSync(p).isDirectory()
  } catch {
    return false
  }
}

/**
 * How many days of transcripts Claude Code keeps before deleting them.
 * Undefined in settings.json means the built-in default of 30 is in force.
 */
export function retentionDays() {
  const settings = readJson(claudeSettingsPath(), {})
  const value = settings?.cleanupPeriodDays
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { days: value, explicit: true }
  }
  return { days: 30, explicit: false }
}

/**
 * Claude Code encodes a project's working directory into its folder name by
 * replacing every non-alphanumeric character with a dash.
 * `D:\Projets\app` becomes `D--Projets-app`.
 */
export function slugForCwd(cwd) {
  return cwd.replace(/[^a-zA-Z0-9]/g, '-')
}
