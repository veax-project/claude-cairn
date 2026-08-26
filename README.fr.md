<div align="center">

<img src="docs/hero.svg" alt="Cairn — vos conversations Claude Code, sur tous vos comptes" width="100%">

<br><br>

# Cairn

**Vos conversations Claude Code, sur tous vos comptes.**<br>
Sauvegardées avant que Claude ne les supprime, et partagées avec chaque compte auquel vous vous connectez.

<br>

[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-D97757?style=flat-square)](LICENSE)
[![For Claude Code](https://img.shields.io/badge/for-Claude%20Code-1B1B1F?style=flat-square)](https://claude.com/claude-code)
[![Dependencies: none](https://img.shields.io/badge/dependencies-none-3A3A44?style=flat-square)](#-où-vont-vos-données)
[![No network calls](https://img.shields.io/badge/network%20calls-none-3A3A44?style=flat-square)](#-où-vont-vos-données)
[![Status: beta](https://img.shields.io/badge/status-beta-D6A854?style=flat-square)](#-bêta)

🇬🇧 [English](README.md) · 🇫🇷 Français · 🇹🇷 [Türkçe](README.tr.md) · 🇦🇿 [Azərbaycanca](README.az.md)

</div>

<br>

---

## 🎯 Pourquoi

Vous vous êtes connecté à un autre compte Claude et vos conversations ont disparu.

**Elles ne sont pas perdues.** Elles sont sur votre disque, exactement là où
elles étaient. Claude tient une liste séparée pour chaque compte, et depuis que
vous vous êtes connecté ailleurs, il lit la mauvaise liste.

Il y a un second problème, plus discret et plus grave : **Claude Code supprime
les conversations au bout de 30 jours.** Par défaut, sans vous prévenir. La
plupart des gens le découvrent quand ce qu'ils voulaient a déjà disparu.

Cairn règle les deux, puis se fait oublier.

---

## 🚀 Installation

### 🪟 Windows — aucun terminal nécessaire

| | |
|---|---|
| **1** | [**⬇ Télécharger `Cairn.cmd`**](https://github.com/veax-project/claude-cairn/releases/download/v1.0.0-beta.1/Cairn.cmd) — votre navigateur peut vous demander si vous voulez conserver le fichier. Conservez-le. |
| **2** | **Double-cliquez** dessus. |
| **3** | Appuyez sur **`1`**, patientez quelques secondes. |
| **4** | **Quittez complètement Claude**, puis rouvrez-le. |

C'est fait. Vos conversations sont de retour dans la barre latérale.

Relancez-le une fois de plus et appuyez sur **`3`** pour activer la
synchronisation automatique : ce sera la dernière fois que vous aurez quelque
chose à faire.

### 🍎 macOS / 🐧 Linux

```bash
npx github:veax-project/claude-cairn
```

Même écran, mêmes étapes.

<br>

> ### ⚠️ Ensuite, quittez et rouvrez Claude
> Claude lit sa liste de conversations **une seule fois, au démarrage**. Cairn
> peut ajouter des entrées à cette liste, mais Claude ne les verra qu'au
> prochain lancement. C'est la raison n°1 pour laquelle les gens croient que ça
> n'a pas marché.

> ### 📦 Il faut [Node.js](https://nodejs.org)
> La plupart des développeurs l'ont déjà. Sinon, la fenêtre vous le signale et
> vous indique où le trouver — installez la version marquée **LTS**, puis
> relancez.

---

## ✨ Ce qu'il fait

- 💾 **Il les sauvegarde.** Chaque conversation est copiée à un endroit où Claude ne supprime rien. Cette copie est à vous, et rien ne l'efface.
- 🔄 **Il les partage.** Chaque compte de votre ordinateur reçoit toutes les conversations — **dans les deux sens**. Commencez quelque chose sur un compte, passez à un autre, c'est là. Revenez, et le travail fait entre-temps est là aussi.
- 👁️ **Il surveille.** Activez la synchronisation automatique : les deux se répètent toutes les dix minutes, dès l'allumage de votre ordinateur. Vous n'y pensez plus jamais.
- 🔎 **Il laisse Claude chercher dedans.** Depuis n'importe quel compte, y compris un compte créé il y a cinq minutes.
- ↩️ **Il s'annule tout seul.** Une commande retire exactement ce qu'il a écrit, et rien d'autre.

---

## 🔌 Laissez Claude chercher dans votre propre historique

```bash
npx github:veax-project/claude-cairn install-mcp
```

Redémarrez Claude, puis demandez-lui des choses comme :

> *cherche dans mes anciennes conversations comment on a corrigé le bug d'authentification*

<div align="center">
<img src="docs/accounts.svg" alt="L'écran des comptes" width="820">
</div>

Ça marche sur **n'importe quel** compte, y compris un tout nouveau. C'est tout
l'intérêt : la connexion appartient à votre ordinateur, pas à un compte.

---

## 🔗 Connecteurs

Cairn note aussi quels connecteurs chaque compte utilisait — Vercel, Gmail,
Stripe, Supabase et les autres — et vous dit lesquels manquent à un nouveau
compte.

```bash
npx github:veax-project/claude-cairn connectors
```

```
On this account
  OK  Vercel          37 tools, last used 2026-08-26

You had these, this account does not
  --  Resend          91 tools, last used 2026-08-04
  --  Stripe           9 tools, last used 2026-08-04
  --  Supabase        29 tools, last used 2026-08-04
```

> **Il ne peut pas les rebrancher, et rien d'autre ne le peut.** Relier un
> service à Claude est une autorisation conservée sur les serveurs d'Anthropic
> pour un compte donné ; il n'existe aucun jeton à copier sur votre ordinateur.
> La bonne nouvelle : le même service peut être relié à autant de comptes Claude
> que vous voulez — le seul coût, ce sont les clics, et voici la liste pour ne
> pas avoir à vous en souvenir.

> **Les serveurs MCP locaux, c'est autre chose.** Ceux de `~/.claude.json` —
> ajoutés par une commande plutôt que par une connexion — sont déjà rattachés à
> la machine, donc ils vous suivent d'un compte à l'autre tout seuls. Ce sont
> les connecteurs distants, ceux qu'on autorise dans le navigateur, qui restent
> en arrière.

---

## 🧯 Dépannage

| Symptôme | Cause | Solution |
|---|---|---|
| 😐 Rien n'est revenu | Claude était déjà ouvert | **Quittez-le complètement** et rouvrez-le — il ne lit la liste qu'au démarrage |
| 🪟 La fenêtre s'est fermée aussitôt | Node.js est absent | Installez-le depuis [nodejs.org](https://nodejs.org), prenez **LTS**, relancez le fichier |
| 🤷 Une conversation manque toujours | Elle appartenait à un autre projet | La barre latérale est filtrée par projet — ouvrez le dossier de ce projet |
| 🔢 Les comptes s'affichent en codes | Rien sur votre disque ne dit qui ils étaient | Appuyez sur **`4`** et nommez-les ; les nouveaux comptes se nomment tout seuls |
| 😱 Ça a aggravé la situation | — | `undo` remet tout exactement comme avant |
| 🍎 Rien du tout sur un Mac | Jamais testé sur Mac | [Racontez-nous ce qui s'est passé](https://github.com/veax-project/claude-cairn/issues/new?template=platform_report.md) — c'est le seul moyen que ce soit corrigé |

---

## 🛡️ Où vont vos données

**Nulle part.** Cairn copie des fichiers d'un dossier de votre ordinateur vers
un autre dossier de votre ordinateur.

- 🚫 **Zéro dépendance.** Le bloc `dependencies` de `package.json` est vide.
- 🚫 **Zéro appel réseau.** Pas de télémétrie, pas de vérification de mise à jour, pas d'analytics. **Coupez votre wifi : toutes les commandes continuent de fonctionner** — le moyen le plus simple de le vérifier vous-même.
- 🔌 Le serveur MCP parle à Claude par l'entrée et la sortie standard. Il n'ouvre aucun socket.
- 🗑️ **Rien n'est jamais supprimé** de votre sauvegarde. Pas même par Cairn.
- ↩️ `undo` retire uniquement ce qu'il a écrit, reconnu à la taille et à l'horodatage — tout ce que Claude a touché depuis est laissé intact.

<details>
<summary><b>📄 Voyez exactement ce que vous installez</b></summary>

<br>

Environ 3 000 lignes de JavaScript ordinaire, sans étape de build, sans
bundler. Onze fichiers dans `src/`, et vous pouvez tous les lire.

Le lanceur est un `.cmd` de 90 lignes qui vérifie la présence de Node,
télécharge l'archive de la version et l'exécute. Il est en pur ASCII et ne fait
rien d'autre.

</details>

---

## 📋 Commandes

| Commande | Ce qu'elle fait |
|---|---|
| `cairn` | Ouvre l'écran présenté en haut de cette page |
| `cairn sync` | Tout sauvegarder, puis tout distribuer à chaque compte |
| `cairn autostart on` | Continuer à le faire, toutes les 10 minutes, dès le démarrage |
| `cairn status` | Ce qui est là, ce qui est caché, ce qui est en danger |
| `cairn undo` | Retirer exactement ce que la dernière synchronisation a écrit |
| `cairn search <words>` | Chercher dans tous les comptes |
| `cairn connectors` | Les connecteurs qui manquent à ce compte |
| `cairn install-mcp` | Laisser Claude chercher lui-même dans l'archive |
| `cairn export` | Écrire chaque conversation en Markdown |
| `cairn pack` | Regrouper des conversations dans un seul fichier à joindre à une discussion |

Votre sauvegarde se trouve dans `~/ClaudeCairn`. Déplacez-la avec
`--vault <folder>` ou la variable d'environnement `CAIRN_VAULT`.

---

## 🔬 Comment ça marche

<details>
<summary><b>Vous n'avez pas besoin de ça pour utiliser Cairn — mais un outil qui touche à vos conversations doit savoir s'expliquer</b></summary>

<br>

Claude Code conserve deux choses distinctes, à deux endroits distincts :

```
~/.claude/projects/<project>/<id>.jsonl
    the conversation itself
    deleted once it is older than cleanupPeriodDays — 30 by default

<appData>/Claude/claude-code-sessions/<account>/<org>/local_*.json
    the sidebar entry that lists it
    one folder per account, which is why switching hides everything
```

Cairn copie la première dans un endroit sûr, et écrit la seconde sous
chaque compte qu'il trouve. Les conversations ne font que s'allonger, donc un
fichier qui n'a pas grossi est ignoré. Rien n'est jamais retiré de la
sauvegarde — une conversation que Claude a déjà supprimée y reste, parce que
cette copie est désormais la seule qui existe.

Claude confronte chaque entrée de barre latérale à un format strict avant de
l'afficher, et écarte en silence tout ce qui ne correspond pas. Cairn les
construit d'après le format observé dans de vrais fichiers : **les horodatages
en nombres plutôt qu'en texte**, aucun champ en trop, et aucune des valeurs
génériques qui apparaissent parfois dans les transcriptions.

L'index de recherche repose sur la recherche plein texte de SQLite, la copie
fournie d'origine avec Node. C'est pour ça qu'il n'y a aucune dépendance.

</details>

---

## ⚠️ Bêta

Une première version. Vérifiée de bout en bout sur Windows : **23 conversations
invisibles depuis des semaines sont revenues** dans la barre latérale après un
redémarrage, et chaque entrée écrite par Cairn a été acceptée.

21 tests automatisés, dont un qui rejoue l'interface sur un terminal simulé à
sept tailles de fenêtre pour repérer les défauts de mise en page.

| | |
|---|---|
| ✅ **Prouvé** | Windows |
| ❓ **Jamais lancé** | macOS, Linux — le code est écrit et relu, rien de plus |
| ❌ **Impossible** | Les conversations que Claude a supprimées avant votre première sauvegarde. Rien ne les ramène. |
| ❌ **Hors périmètre** | Les discussions claude.ai classiques. Elles vivent sur les serveurs d'Anthropic et ne peuvent pas être déplacées entre comptes — une limite du produit, pas de cet outil. |

[Ouvrir un ticket](https://github.com/veax-project/claude-cairn/issues/new/choose) — surtout si vous êtes sur un Mac.

---

<div align="center">

**GPL-3.0** · Construit parce que changer de compte ne devrait pas vous coûter votre travail.

</div>
