# Changelog

> Cairn is licensed under the **GNU GPL v3 or later**. You may read, use and
> modify it freely; a modified version you distribute must stay open under the
> same terms.

## 1.0.0-beta.2

A restored sidebar looked right at a glance and wrong on inspection: the
conversations were all there, complete to the last message, but wearing titles
and dates from weeks earlier. Reported on a machine with 132 restored
conversations, 39 of which showed a stale date and 4 a title the user had
replaced long ago.

### Fixed

- **Metadata no longer freezes at the first backup.** The inventory treated the
  signed-in account's entry as the only truth. Since that entry is the one
  Cairn writes at restore time, every later run read back its own output and
  rewrote it unchanged — so a conversation's title, date and turn count stayed
  pinned to whatever they were the first time it was saved, no matter how much
  it grew afterwards. Entries for the same conversation are now merged across
  accounts: the current account still decides which file to write and whether
  the conversation is visible, while the description of the conversation comes
  from whichever entry knows most about it.
- **A title you typed survives the restore.** `titleSource` was hardcoded to
  `auto`, which handed a renamed conversation back to the app as an ordinary
  generated title — and the app then felt free to replace it. A user title now
  wins over a generated one, whichever account it was set under.
- **Stars are carried across accounts.** `isStarred` was read by nothing and
  written by nothing, so every pinned conversation came back unpinned. It is
  now saved with the session and written back on restore, and, like the app,
  only on entries that actually have it.
- **A conversation that outlived its sidebar entry is dated correctly.** The
  app stops updating an entry once the window closes, while background work
  keeps appending to the transcript. When the file on disk is newer than the
  entry, the file wins.

### Known limits

- The app keeps its own list of pinned sessions, separate from the session
  files Cairn writes. A restored star is recorded correctly but may still need
  one click in the sidebar before the conversation reappears under **Pinned**.

## 1.0.0-beta.1

First public release. Everything below is verified end-to-end on a real
machine: 23 conversations that had been invisible for weeks came back into the
sidebar after a restart, and the desktop app accepted every entry Cairn wrote.

### What it does

- **Backup** — copies every Claude Code transcript into a vault outside
  `~/.claude`, which is the only directory the 30-day cleanup prunes.
- **Sync** — writes a sidebar entry for every saved conversation under *every*
  account on the machine, so switching accounts stops losing history in either
  direction.
- **Autostart** — runs the two above every ten minutes, starting with the
  computer. A hidden shim in the Startup folder on Windows, a LaunchAgent on
  macOS, a systemd user unit on Linux.
- **MCP server** — lets Claude search the whole archive itself. MCP servers are
  configured per machine rather than per account, so a brand-new account can
  reach everything from its first minute.
- **Undo** — removes exactly what the last sync wrote, and nothing else.
- **Export / pack** — Markdown for reading, or one consolidated file to attach
  to a fresh chat.

### Things learned the hard way, now handled

- The desktop app validates each session index file and silently drops anything
  that deviates — visible only as `fails IPC validation` in `main.log`.
  Timestamps must be numbers, not strings, and no extra keys are tolerated.
- Transcripts can carry `<synthetic>` in place of a model id.
- The session folder is read once, at launch. Writing a file is not enough;
  Claude has to be restarted.
- The sidebar is filtered by project directory, so a restored conversation only
  shows up in the project it belonged to.

### Known limits

- **Windows is the only platform tested.** The macOS and Linux paths are
  written and reviewed but have never been run. Reports welcome.
- Conversations Claude deleted before the first backup are gone. Nothing can
  bring those back.
- Cairn does not touch claude.ai chats — only Claude Code sessions, which live
  on your disk.
