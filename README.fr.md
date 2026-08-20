[English](README.md) · [Français](README.fr.md) · [Türkçe](README.tr.md) · [Azərbaycanca](README.az.md)

# Cairn

**Vos conversations Claude Code, sur tous vos comptes.**

> **Bêta.** Vérifié de bout en bout sous Windows — 23 conversations restées
> invisibles pendant des semaines sont revenues après un redémarrage. Le code
> des chemins macOS et Linux est écrit, mais il n'a jamais tourné. Rien n'est
> supprimé, et `undo` annule toutes les modifications.

```bash
npx claude-cairn
```

<p align="center">
  <img src="docs/home.svg" alt="Cairn" width="810">
</p>

Choisissez l'option 2 et vous obtenez une liste numérotée : saisissez les
numéros voulus, appuyez sur entrée, redémarrez Claude. Elles sont de retour.

---

## Les deux choses qui dévorent votre historique

### 1. Claude Code supprime les transcripts au bout de 30 jours

Chaque conversation est stockée sur votre disque, puis supprimée automatiquement
dès qu'elle dépasse l'âge fixé par `cleanupPeriodDays` — **30 jours par
défaut**. Et comme cette clé est absente d'un `settings.json` neuf, presque
personne ne sait que le compte à rebours tourne.

### 2. Changer de compte masque tout ce qui venait de l'ancien

La conversation et l'entrée de la barre latérale qui la référence sont deux
fichiers distincts :

| | Emplacement | Liée à votre compte ? |
|---|---|---|
| **La conversation** | `~/.claude/projects/<project>/<id>.jsonl` | Non |
| **L'entrée de la barre latérale** | `<appData>/Claude/claude-code-sessions/<account>/<org>/local_*.json` | **Oui** |

Connectez-vous avec un autre compte et l'application lit un dossier différent.
Vos conversations sont toujours sur le disque : elles ne sont simplement plus
listées.

Cairn sauvegarde les conversations hors de portée de la purge, et écrit les
entrées de la barre latérale manquantes sous le compte utilisé actuellement.

---

## Installation

Rien à installer. Nécessite Node 22.16+ (pour la recherche plein texte SQLite
livrée avec Node) :

```bash
npx claude-cairn
```

Ou pour le garder sous la main :

```bash
npm install -g claude-cairn
```

---

## Laisser Claude chercher dans votre propre historique

```bash
npx claude-cairn install-mcp
```

Cette commande enregistre Cairn comme serveur MCP. **Les serveurs MCP se
configurent par machine, pas par compte** — c'est là toute l'astuce.
Connectez-vous à un compte tout neuf et Claude atteint quand même tout ce que
vous avez fait jusqu'ici :

> *« cherche dans mes anciennes conversations comment on a corrigé le bug
> d'authentification »*

Redémarrez Claude après l'exécution.

---

## Commandes

Lancer `cairn` sans argument ouvre l'interface ci-dessus. Les commandes nommées
servent aux scripts et aux sauvegardes en arrière-plan.

| Commande | Rôle |
|---|---|
| `cairn` | L'interface interactive |
| `autostart on` | Synchroniser en arrière-plan, indéfiniment · `--every 10` |
| `sync` | Sauvegarder et diffuser vers tous les comptes, une fois |
| `watch` | Synchroniser en continu jusqu'à ce que vous l'arrêtiez · `--every 10` |
| `status` | Ce qui est là, ce qui est masqué, ce qui est menacé |
| `backup` | Sauvegarder uniquement, sans synchroniser |
| `restore` | Synchroniser vers le compte actuel uniquement · `--dry` pour prévisualiser |
| `undo` | Annuler tout ce que la synchronisation a écrit |
| `search <words>` | Chercher sur l'ensemble des comptes |
| `install-mcp` | Laisser Claude chercher lui-même dans l'archive |
| `export` | Tout écrire en Markdown · `--out DIR` |
| `pack [ids…]` | Regrouper des conversations dans un seul fichier pour une nouvelle discussion |
| `reindex` | Reconstruire l'index de recherche |

## À régler une fois, puis à oublier

```bash
npx claude-cairn autostart on
```

À partir de là, toutes les dix minutes et dès le démarrage de l'ordinateur :

- chaque conversation est copiée hors de portée de la purge à 30 jours ;
- **chaque compte de cette machine reçoit toutes les conversations** — pas
  seulement celui auquel vous êtes connecté.

L'aller-retour fonctionne donc : commencez quelque chose sur le compte 1,
basculez sur le compte 2, c'est là. Travaillez sur le compte 2, revenez au
compte 1, ce travail y est aussi. Redémarrez Claude après chaque bascule :
l'application ne lit ces fichiers qu'une seule fois, au lancement.

Pour désactiver : `autostart off`. Rien n'est supprimé au passage.

### Pourquoi les comptes apparaissent d'abord sous forme de codes

Claude range ses dossiers de session par UUID de compte, et rien sur la machine
ne permet de relier un UUID à une personne : le cache OAuth de l'application de
bureau est chiffré et les journaux n'écrivent jamais l'adresse. Seul le compte
auquel vous êtes connecté à cet instant s'identifie, dans `~/.claude.json`.

Cairn le note donc à chaque exécution. Chaque compte utilisé à partir de
maintenant se nomme de lui-même dès la première connexion. Les comptes utilisés
*avant* l'installation de Cairn gardent leur code jusqu'à ce que vous les
nommiez via **Name an account** (« Nommer un compte ») : la liste indique
combien de conversations chacun a démarrées, sa date de dernière utilisation et
l'un de ses titres, ce qui suffit généralement à le reconnaître.

Le coffre se trouve par défaut dans `~/ClaudeCairn`. Vous pouvez le changer avec
`--vault <dir>` ou la variable d'environnement `CAIRN_VAULT`.

---

## Où vont vos données

Nulle part. Cairn copie des fichiers d'un dossier de votre machine vers un autre
dossier de votre machine.

- **Zéro dépendance.** Le `package.json` a un bloc `dependencies` vide.
- **Zéro appel réseau.** Pas de télémétrie, pas de vérification de mise à jour,
  pas d'analytics. Coupez le wifi et chaque commande fonctionne encore — c'est
  la manière la plus simple de le vérifier.
- Le serveur MCP dialogue avec Claude Desktop via stdin/stdout et n'ouvre aucun
  socket.
- Rien n'est jamais supprimé du coffre, et `undo` ne retire que les fichiers
  écrits par Cairn lui-même, identifiés par leur taille et leur horodatage : un
  fichier que Claude a réécrit depuis est laissé intact.

C'est du JavaScript pur, sans étape de compilation. Lisez-le.

---

## Ce que cet outil ne fait *pas*

Autant être direct, car la question vient immédiatement :

- ❌ **Il ne peut pas insérer de conversations dans un compte claude.ai.** La
  documentation d'Anthropic est explicite : les données exportées ne peuvent pas
  être importées dans un autre compte personnel, et aucune API — publique,
  interne ou entreprise — n'expose de moyen d'écrire un message d'assistant dans
  une conversation. Tout outil qui prétend le contraire rejoue vos propres
  messages et laisse Claude répondre à nouveau.
- ❌ **Il ne touche pas aux discussions claude.ai** (le produit de chat
  classique). Celles-ci vivent sur les serveurs d'Anthropic. Utilisez
  *Paramètres → Confidentialité → Exporter les données* avant d'abandonner un
  compte.
- ✅ **Il gère intégralement les sessions Claude Code**, parce qu'elles sont
  déjà sur votre disque.

Pour emporter du contexte vers un nouveau compte, `pack` écrit un unique fichier
Markdown à joindre à une nouvelle discussion — la seule méthode officiellement
prise en charge et garantie d'être lue en entier.

---

## Fonctionnement

```
~/.claude/projects/<project-slug>/<cliSessionId>.jsonl
    la conversation — JSONL, un message par ligne
    supprimée au bout de cleanupPeriodDays (30 par défaut)

<appData>/Claude/claude-code-sessions/<accountUuid>/<orgUuid>/local_*.json
    l'entrée de la barre latérale — titre, projet, modèle et cliSessionId
    cloisonnée par compte : voilà pourquoi changer de compte masque l'historique

<vault>/sessions/<cliSessionId>/transcript.jsonl
    la copie de Cairn, hors de portée de la purge

<vault>/index.db
    SQLite FTS5 sur le texte des messages (vous et l'assistant)
```

`backup` parcourt les deux emplacements et les joint sur `cliSessionId`. Les
transcripts ne font que s'allonger : un fichier dont la taille n'a pas changé
est donc ignoré. Rien n'est jamais retiré du coffre : une conversation que
Claude Code a déjà purgée y reste, signalée, parce que cette copie est
désormais la seule qui existe.

`restore` défait le cloisonnement : il écrit une entrée de la barre latérale
sous votre compte actuel pour tout ce qui manque, et remet en place les
transcripts que la purge a déjà emportés.

Les chemins sont résolus selon la plateforme (`%APPDATA%\Claude` sous Windows,
`~/Library/Application Support/Claude` sous macOS).

---

## Contribuer

Les issues et les PR sont les bienvenues. Particulièrement utiles :

- La confirmation de l'agencement de l'index de sessions sous macOS
- Les versions de Claude Desktop qui déplacent ou remanient ces fichiers

```bash
npm test
```

---

## Licence

MIT
