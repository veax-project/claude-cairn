[English](README.md) · [Français](README.fr.md) · [Türkçe](README.tr.md) · [Azərbaycanca](README.az.md)

# Cairn

**Vos conversations Claude Code, sur tous vos comptes.**

<p align="center">
  <img src="docs/home.svg" alt="Cairn" width="810">
</p>

Vous vous êtes connecté à un autre compte Claude et vos conversations ont
disparu. Elles ne sont pas perdues. Cairn les fait revenir, et empêche que ça
recommence.

---

## Installation

### Windows

**1.** [**⬇ Téléchargez Cairn.cmd**](https://github.com/veax-project/claude-cairn/releases/download/v1.0.0-beta.1/Cairn.cmd) — votre navigateur vous demandera peut-être si vous voulez conserver le fichier. Conservez-le.

**2.** **Double-cliquez** sur le fichier que vous venez de télécharger.

**3.** L'écran ci-dessus s'ouvre. Appuyez sur **`1`**, patientez quelques secondes.

**4.** **Quittez complètement Claude**, puis rouvrez-le.

C'est fait. Vos conversations sont de retour dans la barre latérale.

> **Pourquoi quitter et rouvrir Claude ?** Il lit sa liste de conversations une
> seule fois, au lancement. Cairn peut écrire dans cette liste, mais Claude ne
> le verra qu'au prochain démarrage.

Relancez-le ensuite une dernière fois et appuyez sur **`3`** pour activer la
synchronisation automatique : vous n'aurez plus jamais à recommencer.

> Cairn a besoin de [Node.js](https://nodejs.org) — la plupart des développeurs
> l'ont déjà. Sinon, la fenêtre vous le dit et vous indique où le trouver.
> Installez la version marquée **LTS**, puis double-cliquez à nouveau sur
> Cairn.cmd.

### Mac, Linux, ou si vous préférez un terminal

```bash
npx github:veax-project/claude-cairn
```

Même écran, mêmes étapes.

---

## Ce qui cloche

**Changer de compte masque votre historique.** Vos conversations sont toujours
sur votre disque, intactes. Claude tient simplement une liste séparée pour
chaque compte : dès que vous vous connectez ailleurs, il lit la mauvaise liste.

**Et Claude Code supprime les conversations au bout de 30 jours.** Par défaut,
sans rien dire, que vous changiez de compte ou non. La plupart des gens
l'apprennent quand ce qu'ils cherchaient a déjà disparu.

---

## Ce que Cairn fait pour vous

Trois choses, et ensuite il vous laisse tranquille.

**Il les met à l'abri.** Chaque conversation est copiée dans un endroit où
Claude ne supprime rien. Cette copie est à vous, et rien ne l'efface.

**Il les partage.** Chaque compte de votre ordinateur reçoit toutes les
conversations — dans les deux sens. Vous commencez quelque chose sur un compte,
vous passez à un autre, c'est là. Vous revenez, et le travail fait entre-temps
est là aussi.

**Il veille.** Activez la synchronisation automatique et les deux points
ci-dessus se répètent toutes les dix minutes, dès le démarrage de votre
ordinateur. Vous n'y pensez plus jamais.

---

## Laissez Claude chercher dans votre propre historique

```bash
npx github:veax-project/claude-cairn install-mcp
```

Redémarrez Claude, puis demandez-lui des choses comme :

> *cherche dans mes anciennes conversations comment on a réglé le bug d'authentification*

Ça marche sur **n'importe quel** compte, y compris un compte créé il y a cinq
minutes. C'est tout l'intérêt : cette connexion appartient à votre ordinateur,
pas à un compte. Un compte tout neuf peut donc atteindre tout ce que vous avez
fait jusqu'ici.

<p align="center">
  <img src="docs/accounts.svg" alt="L'écran des comptes" width="810">
</p>

---

## Les questions qu'on nous pose

**Où vont mes données ?**

Nulle part. Cairn copie des fichiers d'un dossier de votre ordinateur vers un
autre dossier de votre ordinateur. Aucune dépendance, aucune télémétrie, aucune
vérification de mise à jour, aucun appel réseau — coupez le wifi, toutes les
commandes marchent quand même. C'est la façon la plus simple de le vérifier
vous-même.

**Et si ça casse quelque chose ?**

```bash
npx github:veax-project/claude-cairn undo
```

Cette commande retire exactement ce que la dernière synchronisation a ajouté, et
rien d'autre. Cairn reconnaît ses propres fichiers à leur taille et à leur date,
donc tout ce que Claude a touché depuis reste intact. Rien n'est jamais supprimé
de votre sauvegarde.

**Pourquoi certains de mes comptes s'affichent avec un code au lieu d'un nom ?**

Parce que rien sur votre ordinateur ne dit à qui ils appartenaient. Claude
n'identifie que le compte auquel vous êtes connecté à cet instant : Cairn note
donc ce nom à chaque passage. Chaque compte que vous utiliserez à partir de
maintenant enregistrera son nom tout seul, dès la première connexion. Pour les
plus anciens, appuyez sur **4** et nommez-les à la main — la liste rappelle ce
sur quoi chaque compte a commencé et quand vous l'avez utilisé pour la dernière
fois, ce qui suffit en général à vous rafraîchir la mémoire.

**Est-ce que ça marche sur Mac ou Linux ?**

Honnêtement : on ne sait pas. Cairn a été développé et vérifié sous Windows. Le
code Mac et Linux est écrit et relu, mais il n'a jamais tourné sur une vraie
machine. Si vous essayez, [racontez-nous ce qui s'est passé](https://github.com/veax-project/claude-cairn/issues/new?template=platform_report.md)
— c'est le seul moyen pour que ça soit corrigé.

**Est-ce que ça marche aussi pour mes conversations Claude habituelles ?**

Non. Uniquement Claude Code. Les conversations classiques vivent sur les
serveurs d'Anthropic et ne peuvent pas être déplacées d'un compte à l'autre —
c'est une limite du produit, pas de cet outil. Utilisez *Settings → Privacy →
Export Data* avant d'abandonner un compte.

**Peut-il remettre d'anciennes conversations dans l'historique d'un nouveau compte ?**

Pour Claude Code, oui — c'est exactement ce qu'il fait. Pour les conversations
classiques, non, et aucun autre outil ne le peut : il n'existe aucun moyen
d'écrire une réponse passée dans un compte Claude. Tout outil qui prétend le
contraire se contente de renvoyer vos propres messages et de laisser Claude
répondre à nouveau.

---

## Commandes

| Commande | Ce que ça fait |
|---|---|
| `cairn` | Ouvre l'écran présenté en haut de cette page |
| `cairn sync` | Sauvegarde tout, puis donne tout à chaque compte |
| `cairn autostart on` | Continue de le faire toutes les 10 minutes, dès le démarrage |
| `cairn status` | Ce qui est là, ce qui est masqué, ce qui est menacé |
| `cairn undo` | Retire exactement ce que la dernière synchronisation a écrit |
| `cairn search <words>` | Cherche dans tous les comptes |
| `cairn install-mcp` | Laisse Claude chercher lui-même dans l'archive |
| `cairn export` | Écrit toutes les conversations en Markdown |
| `cairn pack` | Regroupe des conversations dans un seul fichier, à joindre à un chat |

Votre sauvegarde se trouve dans `~/ClaudeCairn`. Pour la déplacer, utilisez
`--vault <folder>` ou la variable d'environnement `CAIRN_VAULT`.

**Prérequis :** Node 22.16 ou plus récent. Rien d'autre — Cairn n'a aucune
dépendance.

---

## Comment ça marche

*Vous n'avez pas besoin de lire ça pour utiliser Cairn. C'est ici parce qu'un
outil qui touche à vos conversations doit être capable de s'expliquer.*

Claude Code garde deux choses distinctes, à deux endroits distincts :

```
~/.claude/projects/<project>/<id>.jsonl
    la conversation elle-même
    supprimée dès qu'elle dépasse cleanupPeriodDays — 30 jours par défaut

<appData>/Claude/claude-code-sessions/<account>/<org>/local_*.json
    l'entrée de la barre latérale qui la référence
    un dossier par compte, et c'est pour ça que changer de compte masque tout
```

Cairn copie la première dans un endroit sûr, et écrit la seconde sous chaque
compte qu'il trouve. Une conversation ne fait que s'allonger : un fichier qui
n'a pas grossi est donc ignoré, et rien n'est jamais retiré de la sauvegarde.
Une conversation que Claude a déjà supprimée y reste, parce que cette copie est
désormais la seule qui existe.

Avant d'afficher une entrée de barre latérale, Claude vérifie qu'elle respecte
une forme stricte, et écarte sans rien dire tout ce qui ne correspond pas. Cairn
construit les siennes à partir de la forme observée dans de vrais fichiers : des
horodatages en nombres plutôt qu'en texte, aucun champ en trop, et aucune des
valeurs de remplissage qui apparaissent parfois dans les fichiers de
conversation.

L'index de recherche repose sur la recherche plein texte de SQLite, via la copie
livrée avec Node. Le serveur MCP parle à Claude par l'entrée et la sortie
standard, et n'ouvre aucun socket.

---

## Beta

C'est une première version. Elle a été vérifiée de bout en bout sous Windows :
23 conversations restées invisibles pendant des semaines sont revenues dans la
barre latérale après un redémarrage, et chaque entrée écrite par Cairn a été
acceptée.

Il y a 21 tests automatiques, dont un qui rejoue l'interface dans un terminal
simulé à sept tailles de fenêtre pour repérer les défauts de mise en page.

**Ce qui n'est pas prouvé :** macOS et Linux. Et les conversations que Claude a
supprimées avant votre première sauvegarde sont perdues — rien ne peut les faire
revenir.

Un problème ? [Ouvrez une issue](https://github.com/veax-project/claude-cairn/issues/new/choose).

---

MIT
