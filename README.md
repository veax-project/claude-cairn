<div align="center">

<img src="docs/hero.svg" alt="Cairn — your Claude Code conversations, on every account" width="100%">

<br><br>

# Cairn

**Your Claude Code conversations, on every account.**<br>
Saved before Claude deletes them, and shared with every account you sign into.

<br>

[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-D97757?style=flat-square)](LICENSE)
[![For Claude Code](https://img.shields.io/badge/for-Claude%20Code-1B1B1F?style=flat-square)](https://claude.com/claude-code)
[![Dependencies: none](https://img.shields.io/badge/dependencies-none-3A3A44?style=flat-square)](#-where-your-data-goes)
[![No network calls](https://img.shields.io/badge/network%20calls-none-3A3A44?style=flat-square)](#-where-your-data-goes)
[![Status: beta](https://img.shields.io/badge/status-beta-D6A854?style=flat-square)](#-beta)

🇬🇧 English · 🇫🇷 [Français](README.fr.md) · 🇹🇷 [Türkçe](README.tr.md) · 🇦🇿 [Azərbaycanca](README.az.md)

</div>

<br>

---

## 🎯 Why

You signed into a different Claude account and your conversations vanished.

**They are not gone.** They are on your disk, exactly where they were. Claude
keeps a separate list for each account, and after you sign in somewhere else it
is reading the wrong list.

There is a second problem, quieter and worse: **Claude Code deletes
conversations after 30 days.** By default, without telling you. Most people
find out when something they wanted is already gone.

Cairn fixes both, then gets out of the way.

---

## 🚀 Install

### 🪟 Windows — no terminal needed

| | |
|---|---|
| **1** | [**⬇ Download `Cairn.cmd`**](https://github.com/veax-project/claude-cairn/releases/download/v1.0.0-beta.1/Cairn.cmd) — your browser may ask whether to keep the file. Keep it. |
| **2** | **Double-click** it. |
| **3** | Press **`1`**, wait a few seconds. |
| **4** | **Quit Claude completely**, then open it again. |

Done. Your conversations are back in the sidebar.

Run it once more and press **`3`** to turn on automatic sync, so this was the
last time you had to do anything.

### 🍎 macOS / 🐧 Linux

```bash
npx github:veax-project/claude-cairn
```

Same screen, same steps.

<br>

> ### ⚠️ Then quit and reopen Claude
> Claude reads its list of conversations **once, at startup**. Cairn can add to
> that list, but Claude will not notice until the next launch. This is the #1
> reason people think it did not work.

> ### 📦 It needs [Node.js](https://nodejs.org)
> Most developers already have it. If you do not, the window tells you so and
> points you there — install the version marked **LTS**, then run it again.

---

## ✨ What it does

- 💾 **Saves them.** Every conversation is copied somewhere Claude does not delete from. That copy is yours, and nothing removes it.
- 🔄 **Shares them.** Every account on your computer gets every conversation — **in both directions**. Start something on one account, switch to another, it is there. Go back, and the work you did in between is there too.
- 👁️ **Watches.** Turn on automatic sync and both happen every ten minutes, starting with your computer. You never think about it again.
- 🔎 **Lets Claude search it.** From any account, including one you made five minutes ago.
- ↩️ **Undoes itself.** One command removes exactly what it wrote, and nothing else.

---

## 🔌 Let Claude search your own history

```bash
npx github:veax-project/claude-cairn install-mcp
```

Restart Claude, then ask it things like:

> *search my old conversations for how we fixed the auth bug*

<div align="center">
<img src="docs/accounts.svg" alt="The accounts screen" width="820">
</div>

This works on **any** account, including a brand-new one. That is the whole
point: the connection belongs to your computer, not to an account.

---

## 🧯 Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| 😐 Nothing came back | Claude was already open | **Quit it completely** and reopen — it only reads the list at startup |
| 🪟 The window closed instantly | Node.js is missing | Install it from [nodejs.org](https://nodejs.org), pick **LTS**, run the file again |
| 🤷 A conversation is still missing | It belonged to a different project | The sidebar is filtered by project — open that project's folder |
| 🔢 Accounts show as codes | Nothing on your disk says who they were | Press **`4`** and name them; new accounts name themselves |
| 😱 It made things worse | — | `undo` puts everything back exactly as it was |
| 🍎 Nothing at all on a Mac | Never tested there | [Tell us what happened](https://github.com/veax-project/claude-cairn/issues/new?template=platform_report.md) — that is the only way it gets fixed |

---

## 🛡️ Where your data goes

**Nowhere.** Cairn copies files from one folder on your computer to another
folder on your computer.

- 🚫 **Zero dependencies.** The `dependencies` block in `package.json` is empty.
- 🚫 **Zero network calls.** No telemetry, no update check, no analytics. **Turn off your wifi and every command still works** — the easiest way to check for yourself.
- 🔌 The MCP server talks to Claude over standard input and output. It opens no socket.
- 🗑️ **Nothing is ever deleted** from your backup. Not even by Cairn.
- ↩️ `undo` removes only what it wrote, recognised by size and timestamp — anything Claude has touched since is left alone.

<details>
<summary><b>📄 See exactly what you are installing</b></summary>

<br>

Around 3000 lines of plain JavaScript, no build step, no bundler. Eleven files
in `src/`, and you can read any of them.

The launcher is a 90-line `.cmd` that checks for Node, downloads the release
archive, and runs it. It is pure ASCII and does nothing else.

</details>

---

## 📋 Commands

| Command | What it does |
|---|---|
| `cairn` | Opens the screen at the top of this page |
| `cairn sync` | Save everything, then give every account everything |
| `cairn autostart on` | Keep doing that, every 10 minutes, from startup |
| `cairn status` | What is here, what is hidden, what is at risk |
| `cairn undo` | Remove exactly what the last sync wrote |
| `cairn search <words>` | Search across every account |
| `cairn install-mcp` | Let Claude search the archive itself |
| `cairn export` | Write every conversation out as Markdown |
| `cairn pack` | Bundle conversations into one file to attach to a chat |

Your backup lives in `~/ClaudeCairn`. Move it with `--vault <folder>` or the
`CAIRN_VAULT` environment variable.

---

## 🔬 How it works

<details>
<summary><b>You do not need this to use Cairn — but a tool that touches your conversations should be able to explain itself</b></summary>

<br>

Claude Code keeps two separate things, in two separate places:

```
~/.claude/projects/<project>/<id>.jsonl
    the conversation itself
    deleted once it is older than cleanupPeriodDays — 30 by default

<appData>/Claude/claude-code-sessions/<account>/<org>/local_*.json
    the sidebar entry that lists it
    one folder per account, which is why switching hides everything
```

Cairn copies the first somewhere safe, and writes the second under every
account it finds. Conversations are only ever appended to, so a file that has
not grown is skipped. Nothing is ever removed from the backup — a conversation
Claude has already deleted stays, because that copy is now the only one in
existence.

Claude checks each sidebar entry against a strict shape before it will list it,
and silently drops anything that does not match. Cairn builds them from the
shape observed in real files: **timestamps as numbers rather than text**, no
extra fields, and none of the placeholder values that occasionally appear in
transcripts.

The search index is SQLite full-text search, using the copy that ships inside
Node. That is why there are no dependencies.

</details>

---

## ⚠️ Beta

A first release. Verified end to end on Windows: **23 conversations that had
been invisible for weeks came back** into the sidebar after a restart, and
every entry Cairn wrote was accepted.

21 automated tests, including one that replays the interface onto a simulated
terminal at seven window sizes to catch layout faults.

| | |
|---|---|
| ✅ **Proven** | Windows |
| ❓ **Never run** | macOS, Linux — the code is written and reviewed, nothing more |
| ❌ **Impossible** | Conversations Claude deleted before your first backup. Nothing brings those back. |
| ❌ **Out of scope** | Regular claude.ai chats. Those live on Anthropic's servers and cannot be moved between accounts — a limit of the product, not of this tool. |

[Open an issue](https://github.com/veax-project/claude-cairn/issues/new/choose) — especially if you are on a Mac.

---

<div align="center">

**GPL-3.0** · Built because switching accounts should not cost you your work.

</div>
