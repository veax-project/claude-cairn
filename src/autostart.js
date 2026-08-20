/**
 * Start with the machine.
 *
 * Windows: a .vbs shim in the Startup folder. Not Task Scheduler — on some
 * machines it kills child processes that write to disk — and not a service,
 * which would need elevation. The shim exists only to launch node with the
 * console window hidden; a bare .cmd there would flash a black box at login.
 *
 * macOS: a LaunchAgent plist.
 * Linux: a systemd user unit.
 */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const NAME = 'claude-cairn'

function cliPath() {
  return fileURLToPath(new URL('./cli.js', import.meta.url))
}

export function entryPath() {
  if (process.platform === 'win32') {
    return path.join(
      process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
      'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup',
      `${NAME}.vbs`
    )
  }
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'LaunchAgents', `com.${NAME}.plist`)
  }
  return path.join(
    process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'),
    'systemd', 'user', `${NAME}.service`
  )
}

export function isEnabled() {
  return fs.existsSync(entryPath())
}

export function enable({ vault, every = 10 } = {}) {
  const file = entryPath()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content({ vault, every }), 'utf8')
  return file
}

export function disable() {
  const file = entryPath()
  try {
    fs.unlinkSync(file)
    return file
  } catch {
    return null
  }
}

function content({ vault, every }) {
  const node = process.execPath
  const cli = cliPath()
  const args = ['watch', '--every', String(every), '--vault', vault]

  if (process.platform === 'win32') {
    // 0 = hidden window, false = do not wait for it to exit.
    const command = [node, cli, ...args].map((part) => `""${part}""`).join(' ')
    return [
      `' ${NAME} — keeps Claude Code conversations backed up and synced.`,
      `' Delete this file to stop it starting with Windows.`,
      `Set shell = CreateObject("WScript.Shell")`,
      `shell.Run "${command}", 0, False`,
      '',
    ].join('\r\n')
  }

  if (process.platform === 'darwin') {
    const argv = [node, cli, ...args].map((a) => `    <string>${escapeXml(a)}</string>`).join('\n')
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.${NAME}</string>
  <key>ProgramArguments</key>
  <array>
${argv}
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><false/>
</dict>
</plist>
`
  }

  return `[Unit]
Description=${NAME} — keeps Claude Code conversations backed up and synced

[Service]
ExecStart=${node} ${cli} ${args.join(' ')}
Restart=on-failure

[Install]
WantedBy=default.target
`
}

function escapeXml(value) {
  return String(value).replace(/[<>&'"]/g, (ch) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[ch])
  )
}
