/**
 * Builds the archive the Windows launcher downloads.
 *
 * Cairn has no dependencies, so a release is just these files with no build
 * step in between.
 */

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const CONTENTS = ['src', 'package.json', 'README.md', 'LICENSE', 'CHANGELOG.md']

const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'cairn-pack-'))
for (const item of CONTENTS) {
  fs.cpSync(item, path.join(staging, item), { recursive: true })
}

const out = path.resolve('cairn.zip')
fs.rmSync(out, { force: true })

if (process.platform === 'win32') {
  // Listing the children explicitly keeps the staging directory itself out of
  // the archive. Passing a wildcard path instead quietly includes it on some
  // PowerShell versions, which puts everything one level too deep.
  const children = CONTENTS.map((item) => `'${path.join(staging, item)}'`).join(',')
  execFileSync('powershell', [
    '-NoProfile',
    '-Command',
    `Compress-Archive -LiteralPath ${children} -DestinationPath '${out}' -Force`,
  ])
} else {
  execFileSync('zip', ['-rq', out, ...CONTENTS], { cwd: staging })
}

fs.rmSync(staging, { recursive: true, force: true })
console.log(`cairn.zip - ${(fs.statSync(out).size / 1024).toFixed(0)} KB`)
