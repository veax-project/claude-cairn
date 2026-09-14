# Cairn - https://github.com/veax-project/claude-cairn
# Copyright (C) 2026 veax-project. Licensed under the GNU GPL v3 or later.
#
# One-line install for Windows:
#
#     irm veax.tr/cairn | iex
#
# Fetches the released code into a folder of its own and starts it. Nothing is
# installed system-wide, nothing is added to PATH, and the only requirement is
# Node.js.
#
# Deliberately pure ASCII. This file is fetched over HTTP and handed straight to
# the parser, so it must survive a server that forgets to name its charset.
# Colour comes from ANSI escapes, which are ASCII; the box-drawing belongs to
# Cairn's own interface, which takes over as soon as this finishes.
#
# To install without running, or from somewhere else:
#
#     $env:CAIRN_SOURCE = 'https://example.com/cairn.zip'
#     $env:CAIRN_NO_START = '1'
#     irm veax.tr/cairn | iex

$ErrorActionPreference = 'Stop'

$Source = $env:CAIRN_SOURCE
if (-not $Source) { $Source = 'https://github.com/veax-project/claude-cairn/releases/latest/download/cairn.zip' }

$Home_ = Join-Path $env:LOCALAPPDATA 'Cairn'
$Entry = Join-Path $Home_ 'src\cli.js'

# ANSI, but only where it will be read as ANSI. A redirected or legacy console
# would print the escapes literally, which looks worse than no colour at all.
$colour = $Host.UI.RawUI -and -not [Console]::IsOutputRedirected
$e = [char]27
function Paint([string]$text, [string]$code) {
  if ($colour) { "$e[${code}m$text$e[0m" } else { $text }
}
$mark = Paint '*' '38;2;217;119;87'
$dim = { param($t) Paint $t '2' }

function Say([string]$text) { Write-Host "  $text" }
function Step([string]$text) { Write-Host "  $mark $text" }
function Fail([string]$title, [string[]]$lines) {
  Write-Host ''
  Write-Host "  $(Paint 'x' '38;2;200;80;80') $title"
  Write-Host ''
  foreach ($l in $lines) { Say $l }
  Write-Host ''
}

Write-Host ''
Write-Host "  $mark $(Paint 'Cairn' '1')"
Write-Host "    $(& $dim 'Your Claude Code conversations, on every account.')"
Write-Host ''

# --- Node -------------------------------------------------------------------

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Fail 'Cairn needs Node.js, and this computer does not have it.' @(
    "Get it from   $(Paint 'https://nodejs.org' '4')",
    'Choose the version marked LTS, install it, then run this line again.'
  )
  return
}

# --- Download ---------------------------------------------------------------

Step 'Fetching...'

$stage = Join-Path $env:TEMP ('cairn-' + [Guid]::NewGuid().ToString('N'))
$zip = "$stage.zip"

try {
  # Windows PowerShell 5.1 still defaults to protocols GitHub hung up on.
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  Invoke-WebRequest -Uri $Source -OutFile $zip -UseBasicParsing
} catch {
  Fail 'Could not download Cairn.' @(
    $_.Exception.Message,
    '',
    'Check that you are online. If a company network blocks it, fetch the',
    "code by hand instead:  $(Paint 'https://github.com/veax-project/claude-cairn' '4')"
  )
  return
}

# --- Unpack -----------------------------------------------------------------

try {
  Expand-Archive -Path $zip -DestinationPath $stage -Force

  # Zip tools disagree about whether to wrap everything in a top-level folder,
  # and guessing wrong leaves an install that downloaded correctly and then
  # cannot find what it downloaded. Look for src\cli.js and work back from it.
  $cli = Get-ChildItem -Path $stage -Recurse -Filter 'cli.js' |
    Where-Object { $_.Directory.Name -eq 'src' } |
    Select-Object -First 1
  if (-not $cli) { throw 'the archive does not contain src/cli.js' }
  $root = $cli.Directory.Parent.FullName

  if (Test-Path $Home_) { Remove-Item $Home_ -Recurse -Force }
  New-Item -ItemType Directory -Path $Home_ -Force | Out-Null
  Copy-Item -Path (Join-Path $root '*') -Destination $Home_ -Recurse -Force
} catch {
  Fail 'The download arrived but could not be unpacked.' @($_.Exception.Message)
  return
} finally {
  Remove-Item $zip, $stage -Recurse -Force -ErrorAction SilentlyContinue
}

$version = 'installed'
try {
  $pkg = Get-Content (Join-Path $Home_ 'package.json') -Raw | ConvertFrom-Json
  if ($pkg.version) { $version = "v$($pkg.version)" }
} catch { }

Step "Installed $(& $dim $version)"
Say (& $dim $Home_)
Write-Host ''

# --- Run --------------------------------------------------------------------

if ($env:CAIRN_NO_START) {
  Say 'Start it whenever you like:'
  Say (Paint "node `"$Entry`"" '1')
  Write-Host ''
  return
}

# Node cannot detect a 24-bit terminal on its own.
if (-not $env:COLORTERM) { $env:COLORTERM = 'truecolor' }

& $node.Source $Entry
