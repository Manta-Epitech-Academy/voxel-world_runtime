# World Generator — runtime

Le moteur de l'atelier « World Generator » : le monde en 3D, l'éditeur Lua et la console, dans
une seule page. Le code de l'élève est du **Lua**, exécuté dans le navigateur par wasmoon.

**Ce dépôt ne contient pas le sujet de l'atelier**, il vit dans
[voxel-world_subject](https://github.com/Manta-Epitech-Academy/voxel-world_subject) et la
plateforme l'affiche à côté de ce runtime. Ouvert seul, `index.html` reste utilisable.

## Ce qu'il y a ici

| Fichier | Rôle |
|---|---|
| `index.html` | la page servie : l'application d'origine, corrigés retirés, construite par `scripts/port.py` |
| `embed.js` | ce que la plateforme ajoute : le code de validation de chaque étape, le mode plateforme |
| `scripts/port.py` | fabrique `index.html` à partir de `World-Generator.zip` |
| `tests/check.py` | vérifie qu'aucun corrigé ne reste, et que les 7 étapes donnent le bon code |
| `PORT_PLAN.md` | état du portage et ce qui reste à faire |

## Pas de sources lisibles

Il n'existe pas de sources pour cette application, seulement la page d'origine, un build Vite
minifié en un seul fichier (Monaco, three.js et wasmoon inclus), rangée dans
`World-Generator.zip` sur la branche `main`. Le portage ne reconstruit donc pas l'application :
il **patche** cette page. Chaque patch est une chaîne exacte qui doit apparaître une seule
fois, sinon le script s'arrête et dit lequel ne s'applique plus.

```sh
git show main:World-Generator.zip > /tmp/World-Generator.zip
python3 scripts/port.py /tmp/World-Generator.zip           # écrit index.html
python3 tests/check.py /tmp/World-Generator.zip            # Playwright + Chromium
```

## Validation des étapes

Chaque étape a une liste de défis que l'application vérifie au clic sur « ▶ Générer ». Quand
tous sont au vert, et que la plateforme a fourni son secret, `embed.js` affiche un code de
validation :

```
monde{ 12 premiers caractères hexadécimaux de HMAC-SHA256(secret, "voxel-world:<n° d'étape>") }
```

La plateforme calcule la même valeur et en fait le flag de l'étape. Le secret est propre à
chaque instance, donc un code ne sert pas d'une session à l'autre. Le code Lua de l'élève ne
peut pas lire ce secret : wasmoon tourne sans accès au JavaScript de la page
(`injectObjects` et `enableProxy` désactivés).

## Intégration dans la plateforme

Servi à l'identique sous `/runtime/voxel-world/<version>/` (toutes les URL sont relatives).
L'adaptateur `voxel-world.js` côté plateforme transmet le secret, suit l'étape lue par le
participant et recopie le code de validation dans la case de l'étape. Le code de l'élève est
sauvegardé dans `localStorage`, clés `mwg.*`.
