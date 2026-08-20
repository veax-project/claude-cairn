---
name: Bug report
about: Something did not work
labels: bug
---

**What happened**

<!-- What you did, and what you saw instead of what you expected. -->

**Your setup**

- Operating system:
- `node --version`:
- Claude Desktop version (Settings → About):
- Cairn version (`npx claude-cairn@beta --version` or the tag you installed):

**What `status` says**

<!-- Paste the output of: npx claude-cairn status
     It contains counts and paths, no conversation content. -->

```
```

**If a conversation did not appear after a restart**

Claude logs why it rejected a session entry. Search its log for the reason:

- Windows: `%APPDATA%\Claude\logs\main.log`
- macOS: `~/Library/Logs/Claude/main.log`

Look for lines containing `LocalSessions` or `Dropping session`, and paste the
last few here. That line usually names the problem outright.

```
```
