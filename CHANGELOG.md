# Changelog

> Cairn is licensed under the **GNU GPL v3 or later**. You may read, use and
> modify it freely; a modified version you distribute must stay open under the
> same terms.

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
