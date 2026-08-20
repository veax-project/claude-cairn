/**
 * Builds the archive the Windows launcher downloads.
 * Zero dependencies, so the whole tool is just these files.
 */

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'cairn-pack-'))
for (const item of ['src', 'package.json', 'README.md', 'LICENSE', 'CHANGELOG.md']) {
  fs.cpSync(item, path.join(staging, item), { recursive: true })
}

const out = path.resolve('cairn.zip')
fs.rmSync(out, { force: true })

// PowerShell is always present on Windows and needs no extra tooling; on other
// platforms fall back to zip.
if (process.platform === 'win32') {
  execFileSync('powershell', [
    '-NoProfile', '-Command',
    `Compress-Archive -Path '${staging}\*' -DestinationPath '${out}' -Force`,
  ])
} else {
  execFileSync('zip', ['-rq', out, '.'], { cwd: staging })
}

fs.rmSync(staging, { recursive: true, force: true })
console.log(`cairn.zip - ${(fs.statSync(out).size / 1024).toFixed(0)} KB`)
