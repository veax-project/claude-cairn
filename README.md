[English](README.md) · [Français](README.fr.md) · [Türkçe](README.tr.md) · [Azərbaycanca](README.az.md)

# Cairn

**Your Claude Code conversations, on every account.**

<p align="center">
  <img src="docs/home.svg" alt="Cairn" width="810">
</p>

You signed into a different Claude account and your conversations vanished.
They are not gone. Cairn brings them back, and stops it happening again.

---

## Install

### Windows

**1.** [**⬇ Download Cairn.cmd**](https://github.com/veax-project/claude-cairn/releases/download/v1.0.0-beta.1/Cairn.cmd) — your browser may ask whether to keep the file. Keep it.

**2.** **Double-click** the file you just downloaded.

**3.** The screen above opens. Press **`1`**, wait a few seconds.

**4.** **Quit Claude completely** and open it again.

Done. Your conversations are back in the sidebar.

> **Why quit and reopen Claude?** It reads its list of conversations once, at
> startup. Cairn can add to that list, but Claude will not notice until the
> next launch.

Then run it once more and press **`3`** to turn on automatic sync, so you never
have to do this again.

> Cairn needs [Node.js](https://nodejs.org) — most developers already have it.
> If you do not, the window tells you so and points you there. Install the
> version marked **LTS**, then double-click Cairn.cmd again.

### Mac, Linux, or if you prefer a terminal

```bash
npx github:veax-project/claude-cairn
```

Same screen, same steps.

---

## What is going wrong

**Switching accounts hides your history.** Your conversations are still on your
disk, untouched. Claude simply keeps a separate list for each account, and
after you sign in somewhere else it is reading the wrong list.

**And Claude Code deletes conversations after 30 days.** By default, quietly,
whether or not you switch accounts. Most people find out when something they
wanted is already gone.

---

## What Cairn does about it

Three things, then it leaves you alone.

**It saves them.** Every conversation is copied somewhere Claude does not
delete from. That copy is yours, and nothing removes it.

**It shares them.** Every account on your computer gets every conversation —
in both directions. Start something on one account, switch to another, it is
there. Go back, and the work you did in between is there too.

**It watches.** Turn on automatic sync and the two above happen every ten
minutes, starting with your computer. You never think about it again.

---

## Let Claude search your own history

```bash
npx github:veax-project/claude-cairn install-mcp
```

Restart Claude, then ask it things like:

> *search my old conversations for how we fixed the auth bug*

This works on **any** account, including one you created five minutes ago. That
is the point: this connection belongs to your computer, not to an account, so a
brand-new account can reach everything you have ever done.

<p align="center">
  <img src="docs/accounts.svg" alt="The accounts screen" width="810">
</p>

---

## Questions people ask

**Where does my data go?**

Nowhere. Cairn copies files from one folder on your computer to another folder
on your computer. There are no dependencies, no telemetry, no update check, and
no network calls at all — turn off your wifi and every command still works.
That is the easiest way to check for yourself.

**What if it breaks something?**

```bash
npx github:veax-project/claude-cairn undo
```

That removes exactly what the last sync added, and nothing else. It recognises
its own files by size and timestamp, so anything Claude has touched since is
left alone. Nothing is ever deleted from your backup.

**Why are some of my accounts shown as a code instead of a name?**

Because nothing on your computer says who they belonged to. Claude only
identifies the account you are signed into right now, so Cairn writes that name
down each time it runs. Every account you use from now on names itself the
first time you sign in. For older ones, press **4** and name them by hand — the
list shows what each account started with and when you last used it, which is
usually enough to jog your memory.

**Does it work on Mac or Linux?**

Honestly: unknown. Cairn was built and verified on Windows. The Mac and Linux
code is written and reviewed but has never been run on a real machine. If you
try it, [tell us what happened](https://github.com/veax-project/claude-cairn/issues/new?template=platform_report.md)
— that is the only way it gets fixed.

**Does this work for my normal Claude chats too?**

No. Only Claude Code. Regular chats live on Anthropic's servers and cannot be
moved between accounts — that is a limit of the product, not of this tool. Use
*Settings → Privacy → Export Data* before you abandon an account.

**Can it put old conversations into a new account's chat history?**

For Claude Code, yes — that is exactly what it does. For regular chats, no, and
neither can anything else: there is no way to write a past reply into a Claude
account. Any tool that claims otherwise is re-sending your side of the
conversation and letting Claude answer fresh.

---

## Commands

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

**Requirements:** Node 22.16 or newer. Nothing else — Cairn has no
dependencies.

---

## How it works

*You do not need this to use Cairn. It is here because a tool that touches your
conversations should be able to explain itself.*

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
not grown is skipped, and nothing is ever removed from the backup — a
conversation Claude has already deleted stays, because that copy is now the
only one in existence.

Claude checks each sidebar entry against a strict shape before it will list it,
and silently drops anything that does not match. Cairn builds them from the
shape observed in real files: timestamps as numbers rather than text, no extra
fields, and no placeholder values that occasionally appear in transcripts.

The search index is SQLite full-text search, using the copy that ships inside
Node. The MCP server talks to Claude over standard input and output and opens
no socket.

---

## Beta

This is a first release. It has been verified end to end on Windows: 23
conversations that had been invisible for weeks came back into the sidebar
after a restart, and every entry Cairn wrote was accepted.

There are 21 automated tests, including one that replays the interface onto a
simulated terminal at seven window sizes to catch layout faults.

**What is not proven:** macOS and Linux. And conversations Claude deleted
before your first backup are gone — nothing can bring those back.

Found a problem? [Open an issue](https://github.com/veax-project/claude-cairn/issues/new/choose).

---

MIT
