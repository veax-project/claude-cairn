[English](README.md) · [Français](README.fr.md) · [Türkçe](README.tr.md) · [Azərbaycanca](README.az.md)

# Cairn

**Your Claude Code conversations, on every account.**

> **Beta.** Verified end-to-end on Windows — 23 conversations that had been
> invisible for weeks came back after a restart. macOS and Linux paths are
> written but have never been run. Nothing is deleted, and `undo` reverses
> every change.

```bash
npx claude-cairn
```

<p align="center">
  <img src="docs/home.svg" alt="Cairn" width="810">
</p>

Pick option 2 and you get a numbered list — type the numbers you want, hit
enter, restart Claude. They are back.

---

## The two things that eat your history

### 1. Claude Code deletes transcripts after 30 days

Every conversation is stored on your disk, then garbage-collected once it is
older than `cleanupPeriodDays` — **30 days by default**, and that key is absent
from a fresh `settings.json`, so almost nobody knows the timer is running.

### 2. Switching accounts hides everything from the old one

The conversation and the sidebar entry that lists it are two different files:

| | Where it lives | Tied to your account? |
|---|---|---|
| **The conversation** | `~/.claude/projects/<project>/<id>.jsonl` | No |
| **The sidebar entry** | `<appData>/Claude/claude-code-sessions/<account>/<org>/local_*.json` | **Yes** |

Sign in with another account and the app reads a different folder. Your
conversations are still on disk — they are simply not listed any more.

Cairn backs the conversations up out of reach of the cleanup, and writes
the missing sidebar entries under the account you are on now.

---

## Install

Nothing to install. Needs Node 22.16+ (for the SQLite full-text search that
ships inside Node):

```bash
npx claude-cairn
```

Or keep it around:

```bash
npm install -g claude-cairn
```

---

## Let Claude search your own history

```bash
npx claude-cairn install-mcp
```

This registers Cairn as an MCP server. **MCP servers are configured per
machine, not per account** — which is the whole trick. Sign into a brand new
account and Claude can still reach everything you have ever done:

> *"search my old conversations for how we fixed the auth bug"*

Restart Claude after running it.

---

## Commands

Running `cairn` with no arguments opens the interface above. The named
commands are there for scripting and for background backups.

| Command | What it does |
|---|---|
| `cairn` | The interactive interface |
| `autostart on` | Sync in the background, forever · `--every 10` |
| `sync` | Back up and spread to every account, once |
| `watch` | Keep syncing until you stop it · `--every 10` |
| `status` | What is here, what is hidden, what is at risk |
| `backup` | Back up only, no syncing |
| `restore` | Sync to the current account only · `--dry` to preview |
| `undo` | Undo everything the syncing wrote |
| `search <words>` | Search across every account |
| `install-mcp` | Let Claude search the archive itself |
| `export` | Write everything as Markdown · `--out DIR` |
| `pack [ids…]` | Bundle conversations into one file for a new chat |
| `reindex` | Rebuild the search index |

## Set it and forget it

```bash
npx claude-cairn autostart on
```

From then on, every ten minutes and starting with your computer:

- every conversation is copied out of reach of the 30-day cleanup;
- **every account on this machine is given every conversation** — not just the
  one you are signed into.

So the round trip works: start something on account 1, switch to account 2, it
is there. Work on account 2, go back to account 1, that work is there too.
Restart Claude after switching — the app reads these files once, at launch.

Turn it off with `autostart off`. Nothing is deleted when you do.

### Why accounts show as codes at first

Claude stores its session folders by account UUID, and nothing on your machine
maps a UUID back to a person — the desktop app's OAuth cache is encrypted and
the logs never write the address. Only the account you are signed into right
now identifies itself, in `~/.claude.json`.

So Cairn writes that down every time it runs. Every account you use from now on
names itself the first time you sign in. Accounts you used *before* installing
Cairn keep their code until you name them under **Name an account** — the list
shows how many conversations each one started with, when it was last used, and
one of its titles, which is usually enough to recognise it.

The vault defaults to `~/ClaudeCairn`. Override with `--vault <dir>` or the
`CAIRN_VAULT` environment variable.

---

## Where your data goes

Nowhere. Cairn copies files from one folder on your machine to another
folder on your machine.

- **Zero dependencies.** `package.json` has an empty `dependencies` block.
- **Zero network calls.** No telemetry, no update check, no analytics. Turn off
  your wifi and every command still works — the easiest way to verify it.
- The MCP server talks to Claude Desktop over stdin/stdout and opens no socket.
- Nothing is ever deleted from the vault, and `undo` removes only the files
  Cairn itself wrote, identified by size and timestamp — a file Claude has
  rewritten since is left alone.

It is plain JavaScript, no build step. Read it.

---

## What this does *not* do

Being straight about it, because the question comes up immediately:

- ❌ **It cannot put conversations into a claude.ai account.** Anthropic's
  documentation is explicit that exported data cannot be imported into another
  personal account, and no API — public, internal, or enterprise — exposes a
  way to write an assistant message into a conversation. Any tool claiming
  otherwise is replaying your side and letting Claude answer fresh.
- ❌ **It does not touch claude.ai chats** (the regular chat product). Those
  live on Anthropic's servers. Use *Settings → Privacy → Export Data* before
  abandoning an account.
- ✅ **It handles Claude Code sessions completely**, because those are already
  on your disk.

For carrying context onto a new account, `pack` writes a single Markdown file
you attach to a fresh chat — the one method that is officially supported and
guaranteed to be read in full.

---

## How it works

```
~/.claude/projects/<project-slug>/<cliSessionId>.jsonl
    the conversation — JSONL, one message per line
    deleted after cleanupPeriodDays (default 30)

<appData>/Claude/claude-code-sessions/<accountUuid>/<orgUuid>/local_*.json
    the sidebar entry — title, project, model, and cliSessionId
    partitioned per account, which is why switching hides your history

<vault>/sessions/<cliSessionId>/transcript.jsonl
    Cairn's copy, outside the reach of the cleanup

<vault>/index.db
    SQLite FTS5 over user and assistant prose
```

`backup` walks both stores and joins them on `cliSessionId`. Transcripts are
append-only, so a file whose size has not changed is skipped. Nothing is ever
removed from the vault: a conversation Claude Code has already purged stays,
flagged, because that copy is now the only one that exists.

`restore` undoes the partitioning — it writes a sidebar entry under your
current account for anything missing, and puts back any transcript the cleanup
already took.

Paths resolve per platform (`%APPDATA%\Claude` on Windows,
`~/Library/Application Support/Claude` on macOS).

---

## Contributing

Issues and PRs welcome. Particularly useful:

- Confirmation of the session-index layout on macOS
- Claude Desktop releases that move or reshape these files

```bash
npm test
```

---

## License

MIT
